import {readChannelRevision,channelSources} from './profile-channels-storage'
import {Prisma,type PrismaClient,type CampaignPage} from '@prisma/client'
import {z} from 'zod'
import {ProfileError,type ProfileContent} from '@/domain/profiles/profile'
import {profileInput} from '@/domain/profiles/profile-input'
import {campaignContent,campaignCreateInput,campaignUpdateInput,campaignIsPublished} from '@/domain/profiles/campaign-page'
import {ContentReviewRequired} from '@/domain/moderation/content-review'
import {assertProfileOwner,projectCampaignSnapshot} from './profiles-repository'
import {availableProfileRevisions} from './profile-revisions'
import {validateProfile,type ProfileValidationPorts} from '@/use-cases/@Profiles/validate-profile'
import {assertProfilePublicationPresence} from '@/use-cases/@Profiles/publication-structure'
import {profileNow} from '@/lib/profile-clock'
type Tx=Prisma.TransactionClient
type Actor={tenantId:string;ownerId:string;age:boolean}
export const campaignQuery=z.object({q:z.string().trim().max(100).default(''),state:z.enum(['ALL','DRAFT','PUBLISHED','ARCHIVED']).default('ALL'),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict()
const scoped=(a:Actor)=>({tenantId:a.tenantId,ownerId:a.ownerId})
async function owner(tx:Tx,a:Actor,write=false){if(write)await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;await assertProfileOwner(tx,a)}
async function owned(tx:Tx,a:Actor,id:string,write=false){
 await owner(tx,a,write)
 if(write)await tx.$queryRaw`SELECT id FROM campaign_pages WHERE id=${id} AND "tenantId"=${a.tenantId} AND "ownerId"=${a.ownerId} FOR UPDATE`
 const row=await tx.campaignPage.findFirst({where:{id,...scoped(a)}});if(!row)throw new ProfileError(404,'Campanha não encontrada.');return row
}
function cas(row:CampaignPage,expected:number){if(row.version!==expected)throw new ProfileError(409,'A campanha mudou em outra aba. Atualize antes de salvar.')}
function dto(row:CampaignPage,slug:string){return {id:row.id,name:row.name,slug:row.slug,state:row.state,version:row.version,publishedVersion:row.publishedVersion,sourceRevisionId:row.sourceRevisionId,sourceVersion:row.sourceVersion,changed:row.state==='PUBLISHED'&&JSON.stringify(profileInput.parse(row.content))!==JSON.stringify(profileInput.parse(row.publication)),publicPath:'/p/'+encodeURIComponent(slug)+'/c/'+encodeURIComponent(row.slug),createdAt:row.createdAt.toISOString()}}
async function detail(tx:Tx,row:CampaignPage){const p=await tx.profile.findUniqueOrThrow({where:{id:row.profileId}});return {...dto(row,p.slug),content:profileInput.parse(row.content),source:profileInput.parse(row.sourceSnapshot)}}
export async function listCampaigns(db:PrismaClient,a:Actor,query:z.infer<typeof campaignQuery>){return db.$transaction(async tx=>{
 await owner(tx,a);const p=await tx.profile.findUnique({where:{tenantId_ownerId:scoped(a)}})
 const where={...scoped(a),...(query.state==='ALL'?{}:{state:query.state}),...(query.q?{name:{contains:query.q,mode:'insensitive' as const}}:{})}
 const [rows,total]=await Promise.all([tx.campaignPage.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(query.page-1)*20,take:20}),tx.campaignPage.count({where})])
 return {campaigns:rows.map(row=>dto(row,p!.slug)),page:query.page,pageSize:20,total,hasPublishedProfile:Boolean(p?.publication)}
 },{isolationLevel:'RepeatableRead'})}
export function readCampaign(db:PrismaClient,a:Actor,id:string){return db.$transaction(async tx=>detail(tx,await owned(tx,a,id)))}
export function createCampaign(db:PrismaClient,a:Actor,input:z.infer<typeof campaignCreateInput>){return db.$transaction(async tx=>{
 await owner(tx,a,true);const p=await tx.profile.findUnique({where:{tenantId_ownerId:scoped(a)}});if(!p)throw new ProfileError(404,'Publique sua página antes de criar uma campanha.')
 const revision=(await availableProfileRevisions(tx,p,profileNow())).find(row=>row.id===input.sourceRevisionId&&row.tenantId===a.tenantId&&row.ownerId===a.ownerId)
 if(!revision)throw new ProfileError(404,'Escolha uma publicação disponível no seu histórico.')
 const source=profileInput.parse(revision.snapshot),channels=await readChannelRevision(tx,p,revision.version),references=new Set(channels.groups.flatMap(group=>group.channels.map(row=>row.revisionId)))
 if(references.size){const facts=await channelSources(tx,p,channels);if(facts.destinations.length<references.size||facts.destinations.some(row=>row.requiresAge))source.requiresAge=true}
 const content=campaignContent(source,input.itemSelection)
 const previous=await tx.campaignPage.findUnique({where:{profileId_slug:{profileId:p.id,slug:input.slug}}})
 if(previous){if(previous.name===input.name&&previous.sourceRevisionId===revision.id&&JSON.stringify(profileInput.parse(previous.content))===JSON.stringify(content))return detail(tx,previous);throw new ProfileError(409,'Este endereço já está em uso por outra campanha.')}
 const row=await tx.campaignPage.create({data:{...scoped(a),profileId:p.id,name:input.name,slug:input.slug,sourceRevisionId:revision.id,sourceVersion:revision.version,sourceSnapshot:source,content}})
 await audit(tx,a,row,'created');return detail(tx,row)
 })}
export function updateCampaign(db:PrismaClient,a:Actor,id:string,input:z.infer<typeof campaignUpdateInput>){return db.$transaction(async tx=>{
 const row=await owned(tx,a,id,true);cas(row,input.expectedVersion)
 if(row.state==='PUBLISHED'&&input.slug!==row.slug)throw new ProfileError(409,'Arquive a campanha antes de mudar o endereço.')
 const content=campaignContent(profileInput.parse(row.sourceSnapshot),input.itemSelection)
 if(row.name===input.name&&row.slug===input.slug&&JSON.stringify(profileInput.parse(row.content))===JSON.stringify(content))return detail(tx,row)
 const next=await tx.campaignPage.update({where:{id},data:{name:input.name,slug:input.slug,content,state:row.state==='ARCHIVED'?'DRAFT':row.state,version:{increment:1}}});await audit(tx,a,next,'updated');return detail(tx,next)
 })}
async function audit(tx:Tx,a:Actor,row:CampaignPage,action:string){await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.ownerId,action:'profile.campaign.'+action,entityType:'CampaignPage',entityId:row.id,after:{version:row.version,state:row.state,sourceVersion:row.sourceVersion}}})}
export function publishCampaign(db:PrismaClient,a:Actor,id:string,expected:number,ports:ProfileValidationPorts){return db.$transaction(async tx=>{
 const row=await owned(tx,a,id,true);await assertProfileOwner(tx,a,true);cas(row,expected)
 const p=await tx.profile.findUniqueOrThrow({where:{id:row.profileId}});if(!p.publication)throw new ProfileError(409,'Publique sua página principal antes da campanha.')
 const source=profileInput.parse(row.sourceSnapshot),selected=profileInput.parse(row.content)
 // The source is server-owned immutable approved content; the client can only select existing visible IDs.
 const content=campaignContent(source,selected.items.map(item=>item.id));assertProfilePublicationPresence(content)
 const refs=content.items.filter(item=>item.type==='CATALOG').map(item=>item.destination)
 if(await tx.link.count({where:{id:{in:refs},tenantId:a.tenantId,ownerId:a.ownerId,status:'PUBLISHED',niche:{tenantId:a.tenantId},network:{tenantId:a.tenantId}}})!==new Set(refs).size)throw new ProfileError(422,'Uma referência do catálogo está indisponível. Revise os links selecionados.')
 let approved:ProfileContent
 try{approved=await validateProfile(tx,a.tenantId,content,ports,false,source)}catch(error){if(error instanceof ContentReviewRequired)throw new ProfileError(409,'Revise e publique a página de origem antes de criar esta campanha.');throw error}
 if(row.state==='PUBLISHED'&&JSON.stringify(profileInput.parse(row.publication))===JSON.stringify(approved))return detail(tx,row)
 const next=await tx.campaignPage.update({where:{id},data:{state:'PUBLISHED',publication:approved,publishedVersion:row.version}});await audit(tx,a,next,'published');return detail(tx,next)
 },{timeout:35000})}
export function archiveCampaign(db:PrismaClient,a:Actor,id:string,expected:number){return db.$transaction(async tx=>{
 const row=await owned(tx,a,id,true);if(row.state==='ARCHIVED')return detail(tx,row);cas(row,expected)
 const next=await tx.campaignPage.update({where:{id},data:{state:'ARCHIVED',publication:Prisma.DbNull,publishedVersion:null,version:{increment:1}}});await audit(tx,a,next,'archived');return detail(tx,next)
 })}
export function deleteCampaign(db:PrismaClient,a:Actor,id:string,expected:number){return db.$transaction(async tx=>{
 const row=await owned(tx,a,id,true);cas(row,expected);if(row.state==='PUBLISHED')throw new ProfileError(409,'Arquive a campanha antes de excluir.');await audit(tx,a,row,'deleted');await tx.campaignPage.delete({where:{id}});return {deleted:true}
 })}
export async function publicCampaignProjection(tx:Tx,tenantId:string,slug:string,campaignSlug:string,age:boolean){
 const p=await tx.profile.findUnique({where:{tenantId_slug:{tenantId,slug}},include:{owner:{select:{status:true}}}})
 if(!p?.publication||p.owner.status!=='ACTIVE')throw new ProfileError(404,'Campanha não encontrada.')
 const row=await tx.campaignPage.findUnique({where:{profileId_slug:{profileId:p.id,slug:campaignSlug}}})
 if(!row||row.tenantId!==tenantId||row.ownerId!==p.ownerId||!campaignIsPublished(row))throw new ProfileError(404,'Campanha não encontrada.')
 const content=profileInput.parse(row.publication),main=profileInput.parse(p.publication)
 if(content.avatarAssetId!==main.avatarAssetId)content.avatarAssetId=null
 const view=await projectCampaignSnapshot(tx,{tenantId,ownerId:p.ownerId,age},content,row.publishedVersion!,p)
 return {...view,...(!view.restricted?{campaign:{id:row.id,slug:row.slug}}:{})}
}
export function publicCampaign(db:PrismaClient,tenantId:string,slug:string,campaignSlug:string,age:boolean){return db.$transaction(tx=>publicCampaignProjection(tx,tenantId,slug,campaignSlug,age),{isolationLevel:'RepeatableRead'})}
export function previewCampaign(db:PrismaClient,a:Actor,id:string){return db.$transaction(async tx=>{
 const row=await owned(tx,a,id),p=await tx.profile.findUniqueOrThrow({where:{id:row.profileId}}),content=profileInput.parse(row.content)
 if(!p.publication||content.avatarAssetId!==profileInput.parse(p.publication).avatarAssetId)content.avatarAssetId=null
 const view=await projectCampaignSnapshot(tx,a,content,row.version,p)
 return {...view,parentSlug:p.slug}
 },{isolationLevel:'RepeatableRead'})}
