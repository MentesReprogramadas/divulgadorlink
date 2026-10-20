import {publicCampaignProjection} from './campaign-pages'
import {createHmac,randomUUID} from 'node:crypto'
import {Prisma,type PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {env} from '@/env'
import {ProfileError,visibleProfile} from '@/domain/profiles/profile'
import {profileInput} from '@/domain/profiles/profile-input'
import {analyticsDay} from '@/domain/analytics/day'
import {performanceRange} from '@/domain/analytics/performance'
import {interactionIdentity,PROFILE_INTERACTION_MIN_SAMPLE,PROFILE_INTERACTION_RETENTION_DAYS,type InteractionEvent,profileInteractionInput,profileInteractionSummary} from '@/domain/analytics/profile-interaction'
import {readChannelRevision,channelSummary} from './profile-channels-storage'
import {profileBillingRuntime} from '@/lib/profile-billing'
import {profileNow} from '@/lib/profile-clock'
import {readProfileInteraction,signProfileInteraction,readCampaignInteraction,signCampaignInteraction,PROFILE_MEASUREMENT_TOKEN_MS} from '@/lib/profile-interaction-token'
import {assertProfileOwner,publicProfileProjection} from './profiles-repository'
import {profilePaidCapabilityCoverage} from './profile-capability-coverage'
import {availableProfileRevisions} from './profile-revisions'

type Actor={tenantId:string;ownerId:string;age:boolean}
const coverage=(tx:Prisma.TransactionClient,actor:{tenantId:string;ownerId:string},now:Date)=>profilePaidCapabilityCoverage(tx,actor,profileBillingRuntime().delivered,now,'profile.analytics')
export async function profileMeasurementDescriptor(db:PrismaClient,tenantId:string,slug:string,revisionId:number,campaignId?:string){
 return db.$transaction(async tx=>{
  const p=await tx.profile.findUnique({where:{tenantId_slug:{tenantId,slug}}})
  if(!p?.publication)return undefined
  const campaign=campaignId?await tx.campaignPage.findFirst({where:{id:campaignId,tenantId,profileId:p.id,ownerId:p.ownerId,state:'PUBLISHED',publishedVersion:revisionId}}):null
  if(campaignId?!campaign:p.publishedVersion!==revisionId)return undefined
  if(!(await coverage(tx,{tenantId,ownerId:p.ownerId},profileNow())).enabled)return undefined
  const preference=await tx.profileMeasurement.findUnique({where:{profileId:p.id}})
  if(!preference?.enabled)return undefined
  const now=profileNow(),context={tenantId,profileId:p.id,revisionId}
  return {profileId:p.id,revisionId,...(campaignId?{campaignId}:{}),surfaceToken:campaignId?signCampaignInteraction({...context,campaignId},env.JWT_SECRET,now):signProfileInteraction(context,env.JWT_SECRET,now),issuedAt:now.toISOString(),expiresAt:new Date(+now+PROFILE_MEASUREMENT_TOKEN_MS).toISOString()}
 })
}
export async function profileMeasurementPreference(db:PrismaClient,actor:Actor,change?:{enabled:boolean;expectedVersion:number}){
 return db.$transaction(async tx=>{
  await assertProfileOwner(tx,actor,Boolean(change))
  await tx.$queryRaw`SELECT id FROM profiles WHERE "tenantId"=${actor.tenantId} AND "ownerId"=${actor.ownerId} FOR UPDATE`
  const p=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:actor.tenantId,ownerId:actor.ownerId}}})
  if(!p)throw new ProfileError(404,'Crie sua página primeiro.')
  const allowed=(await coverage(tx,actor,profileNow())).enabled
  let row=await tx.profileMeasurement.findUnique({where:{profileId:p.id}})
  if(change){
   if(change.enabled&&!allowed)throw new ProfileError(403,'Seu plano não inclui métricas da página.')
   if((row?.version??0)!==change.expectedVersion)throw new ProfileError(409,'As preferências mudaram. Recarregue antes de salvar.')
   row=await tx.profileMeasurement.upsert({where:{profileId:p.id},create:{profileId:p.id,tenantId:actor.tenantId,ownerId:actor.ownerId,enabled:change.enabled,version:1},update:{enabled:change.enabled,version:{increment:1}}})
   await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'profile.measurement.changed',entityType:'Profile',entityId:p.id,after:{enabled:change.enabled,version:row.version}}})
  }
  return {enabled:row?.enabled??false,version:row?.version??0,allowed}
 })
}
export async function collectProfileInteraction(db:PrismaClient,tenantId:string,input:z.infer<typeof profileInteractionInput>,session:string,excluded:(ownerId:string)=>boolean,age=false,campaignId?:string){
 const now=profileNow(),context={tenantId,profileId:input.profileId,revisionId:input.revisionId}
 if(!(campaignId?readCampaignInteraction(input.surfaceToken,{...context,campaignId},env.JWT_SECRET,now):readProfileInteraction(input.surfaceToken,context,env.JWT_SECRET,now)))throw new ProfileError(422,'A página mudou ou a sessão expirou. Recarregue a página.')
 return db.$transaction(async tx=>{
  const initial=await tx.profile.findFirst({where:{id:input.profileId,tenantId}})
  if(!initial)throw new ProfileError(404,'Página não encontrada.')
  await tx.$queryRaw`SELECT id FROM users WHERE id=${initial.ownerId} AND "tenantId"=${tenantId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM profiles WHERE id=${input.profileId} AND "tenantId"=${tenantId} FOR SHARE`
  const p=await tx.profile.findFirst({where:{id:initial.id,tenantId}})
  if(!p)throw new ProfileError(404,'Página não encontrada.')
  if(excluded(p.ownerId))return {counted:false}
  const campaign=campaignId?await tx.campaignPage.findFirst({where:{id:campaignId,tenantId,profileId:p.id,ownerId:p.ownerId}}):null
  if(campaignId)await tx.$queryRaw`SELECT id FROM campaign_pages WHERE id=${campaignId} AND "tenantId"=${tenantId} FOR SHARE`
  const currentCampaign=campaignId?await tx.campaignPage.findFirst({where:{id:campaignId,tenantId,profileId:p.id,state:'PUBLISHED',publishedVersion:input.revisionId}}):null
  if(!p.publication||(campaignId?!currentCampaign:p.publishedVersion!==input.revisionId))throw new ProfileError(409,'Esta publicação mudou. Recarregue a página.')
  if(!(await tx.profileMeasurement.findUnique({where:{profileId:p.id}}))?.enabled||!(await coverage(tx,{tenantId,ownerId:p.ownerId},now)).enabled)return {counted:false}
  const view=campaignId&&campaign?await publicCampaignProjection(tx,tenantId,p.slug,campaign.slug,age):await publicProfileProjection(tx,tenantId,p.slug,age)
  if(view.restricted)return {counted:false}
  if(input.blockId&&!view.items.some(item=>item.id===input.blockId))throw new ProfileError(422,'Este bloco não está disponível.')
  const day=analyticsDay(now),sessionKey=createHmac('sha256',env.JWT_SECRET).update(JSON.stringify(['profile-session.v1',tenantId,day,session])).digest('hex')
  const event:InteractionEvent={...input,...(campaignId?{campaignId}:{}),tenantId,sessionKey,day},dedupeKey=interactionIdentity(event)
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([tenantId,p.id,day,sessionKey])},0))::text`
  const retry=await tx.profileInteractionEvent.findUnique({where:{tenantId_eventId:{tenantId,eventId:input.eventId}}})
  if(retry){if(retry.dedupeKey!==dedupeKey)throw new ProfileError(409,'Identificador de evento já utilizado.');return {counted:false}}
  if(await tx.profileInteractionEvent.findUnique({where:{tenantId_profileId_dedupeKey:{tenantId,profileId:p.id,dedupeKey}}}))return {counted:false}
  if(await tx.profileInteractionEvent.count({where:{tenantId,profileId:p.id,campaignId:campaignId??null,sessionKey,day:new Date(day)}})>=1500)throw new ProfileError(429,'Limite de medição atingido.')
  const created=await tx.profileInteractionEvent.createMany({data:[{id:randomUUID(),eventId:input.eventId,tenantId,profileId:p.id,ownerId:p.ownerId,campaignId:campaignId??null,revisionId:input.revisionId,blockId:input.blockId,kind:input.kind,viewportBucket:input.viewportBucket,scrollBucket:input.scrollBucket,sessionKey,dedupeKey,day:new Date(day),createdAt:now}],skipDuplicates:true})
  if(!created.count){const conflict=await tx.profileInteractionEvent.findUnique({where:{tenantId_eventId:{tenantId,eventId:input.eventId}}});if(conflict&&conflict.dedupeKey!==dedupeKey)throw new ProfileError(409,'Identificador de evento já utilizado.')}
  return {counted:created.count===1}
 })
}
export const interactionQuery=z.object({from:z.string().optional(),to:z.string().optional(),revision:z.coerce.number().int().positive().optional(),viewport:z.enum(['ALL','MOBILE','TABLET','DESKTOP']).default('ALL')}).strict()
export async function readProfileInteractionReport(db:PrismaClient,actor:Actor,query:z.infer<typeof interactionQuery>,campaignId?:string){
 const now=profileNow();let range:ReturnType<typeof performanceRange>
 try{range=performanceRange(query,now);if(range.days>180||+range.start<+now-PROFILE_INTERACTION_RETENTION_DAYS*86400000)throw new Error()}catch{throw new ProfileError(422,'Escolha um período válido nos últimos 180 dias.')}
 return db.$transaction(async tx=>{
  await assertProfileOwner(tx,actor)
  const p=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:actor.tenantId,ownerId:actor.ownerId}}})
  if(!p)throw new ProfileError(404,'Página não encontrada.')
  if(!(await coverage(tx,actor,now)).enabled)throw new ProfileError(403,'Seu plano não inclui métricas da página.')
  const campaign=campaignId?await tx.campaignPage.findFirst({where:{id:campaignId,tenantId:actor.tenantId,ownerId:actor.ownerId,profileId:p.id}}):null
  if(campaignId&&!campaign)throw new ProfileError(404,'Campanha não encontrada.')
  const scope=campaignId?Prisma.sql`AND "campaignId"=${campaignId}`:Prisma.sql`AND "campaignId" IS NULL`
  const retained=campaign?[]:await availableProfileRevisions(tx,p,now)
  const measured=await tx.$queryRaw<Array<{revisionId:number}>>`SELECT DISTINCT "revisionId" FROM profile_interaction_events WHERE "tenantId"=${actor.tenantId} AND "profileId"=${p.id} ${scope} AND "createdAt">=${new Date(+now-PROFILE_INTERACTION_RETENTION_DAYS*86400000)} ORDER BY "revisionId" DESC`
  const revisions=[...new Set([...retained.map(row=>row.version),...measured.map(row=>row.revisionId),...((campaign?campaign.publishedVersion:p.publishedVersion)?[(campaign?campaign.publishedVersion:p.publishedVersion)!]:[])])].sort((a,b)=>b-a)
  const revision=query.revision??(campaign?campaign.publishedVersion:p.publishedVersion)??revisions[0]??null
  if(revision!==null&&!revisions.includes(revision))throw new ProfileError(404,'Versão indisponível.')
  const snapshot=campaign?(revision===campaign.publishedVersion?campaign.publication:null):retained.find(row=>row.version===revision)?.snapshot??(revision===p.publishedVersion?p.publication:null)
  const parsed=snapshot?profileInput.safeParse(snapshot):null
  // Historical labels are presentation only; live ingestion still uses the authoritative projection.
  const labelContent=parsed?.success?visibleProfile(parsed.data,new Set(parsed.data.items.filter(item=>item.type==='CATALOG').map(item=>item.destination))):null
  const labels=new Map(labelContent?.items.map(item=>[item.id,item.label])??[])
  if(!campaign&&labelContent&&revision!==null){const groups=await channelSummary(tx,p,labelContent,await readChannelRevision(tx,p,revision));for(const group of groups)for(const channel of group.channels)if(labels.has(channel.id))labels.set(channel.id,channel.networkName+': '+channel.label)}
  const rows=revision===null?[]:await tx.$queryRaw<Array<{kind:string;blockId:string|null;count:bigint}>>(Prisma.sql`
   SELECT kind,"blockId",COUNT(*)::bigint AS count FROM profile_interaction_events
   WHERE "tenantId"=${actor.tenantId} AND "profileId"=${p.id} ${scope} AND "revisionId"=${revision}
    AND "createdAt">=${range.start} AND "createdAt"<${range.end}
    ${query.viewport==='ALL'?Prisma.empty:Prisma.sql`AND "viewportBucket"=${query.viewport}`}
   GROUP BY kind,"blockId"`)
  const sessions=revision===null?[]:await tx.$queryRaw<Array<{sessions:bigint;reach25:bigint;reach50:bigint;reach75:bigint;reach100:bigint}>>(Prisma.sql`
   WITH measured AS (SELECT day,"sessionKey",BOOL_OR(kind='PAGE') AS page,MAX("scrollBucket") AS reach
    FROM profile_interaction_events WHERE "tenantId"=${actor.tenantId} AND "profileId"=${p.id} ${scope} AND "revisionId"=${revision}
    AND "createdAt">=${range.start} AND "createdAt"<${range.end}
    ${query.viewport==='ALL'?Prisma.empty:Prisma.sql`AND "viewportBucket"=${query.viewport}`} GROUP BY day,"sessionKey")
   SELECT COUNT(*) FILTER(WHERE page)::bigint AS sessions,COUNT(*) FILTER(WHERE reach>=25)::bigint AS reach25,
    COUNT(*) FILTER(WHERE reach>=50)::bigint AS reach50,COUNT(*) FILTER(WHERE reach>=75)::bigint AS reach75,
    COUNT(*) FILTER(WHERE reach>=100)::bigint AS reach100 FROM measured`)
  const sample=Number(sessions[0]?.sessions??0)
  const blockIds=[...new Set([...labels.keys(),...rows.flatMap(row=>row.blockId?[row.blockId]:[])])]
  const count=(kind:string,id:string|null)=>Number(rows.find(row=>row.kind===kind&&row.blockId===id)?.count??0)
  const summary=profileInteractionSummary({sessions:sample,pageViews:count('PAGE',null),blocks:blockIds.map(id=>({id,impressions:count('IMPRESSION',id),clicks:count('CLICK',id)})),reach:new Map([25,50,75,100].map(threshold=>[threshold,Number(sessions[0]?.[('reach'+threshold) as 'reach25']??0)]))},blockIds.map(id=>({id,label:labels.get(id)??'Bloco removido ou versão indisponível'})))
  return {...(campaign?{campaignId:campaign.id}:{}),range:{from:range.from,to:range.to},revision,viewport:query.viewport,revisions,minimumSample:PROFILE_INTERACTION_MIN_SAMPLE,retentionDays:PROFILE_INTERACTION_RETENTION_DAYS,coverage:'Somente visitas com consentimento; sessões diárias, sem estimativa de pessoas únicas.',summary}
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead})
}
export function purgeProfileInteractions(db:PrismaClient,now=new Date()){return db.profileInteractionEvent.deleteMany({where:{createdAt:{lt:new Date(+now-PROFILE_INTERACTION_RETENTION_DAYS*86400000)}}})}
