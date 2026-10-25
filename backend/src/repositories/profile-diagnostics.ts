import {Prisma,type PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {ProfileError} from '@/domain/profiles/profile'
import type {ProfileActor} from '@/domain/access/profile-access'
import {canWorkspace,workspaceGrants} from '@/domain/access/workspace-permissions'
import {profileDiagnostics,DIAGNOSTIC_RULE_VERSION} from '@/domain/profiles/profile-diagnostics'
import {profileInput} from '@/domain/profiles/profile-input'
import {assertProfileOwner,readProfile} from './profiles-repository'
import {interactionQuery,readProfileInteractionReport,profileMeasurementPreference} from './profile-interactions'
import {profileNow} from '@/lib/profile-clock'
export const diagnosticsQuery=interactionQuery.pick({from:true,to:true})
export async function readProfileDiagnostics(db:PrismaClient,a:ProfileActor,query:z.infer<typeof diagnosticsQuery>){
 const state=await readProfile(db,a),draft=state.draft,now=profileNow()
 if(!draft)return{page:null,findings:[],ignored:0,coverage:'NO_PAGE',range:null,revision:null,unverifiedUrls:0}
 const page=await db.profile.findUniqueOrThrow({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}}})
 const links=await db.link.findMany({where:{tenantId:a.tenantId,id:{in:draft.items.filter(i=>i.type==='CATALOG').map(i=>i.destination)}},select:{id:true,status:true,availability:{select:{state:true,checkedAt:true}}}})
 const unavailable=new Map(links.filter(row=>row.status==='UNAVAILABLE'||row.availability?.state==='UNAVAILABLE'&&row.availability.checkedAt&&+row.availability.checkedAt>=+now-86400000).map(row=>[row.id,{checkedAt:row.availability?.checkedAt?.toISOString()??null}]))
 let coverage='NO_DATA',report:Awaited<ReturnType<typeof readProfileInteractionReport>>|null=null
 let canReport=true
 if(a.auditActorId&&a.auditActorId!==a.ownerId){const member=await db.workspaceMembership.findUnique({where:{tenantId_ownerId_userId:{tenantId:a.tenantId,ownerId:a.ownerId,userId:a.auditActorId}}});canReport=!!member&&!member.revokedAt&&canWorkspace(workspaceGrants.parse(member.grants),'reports',false)}
 if(!canReport)coverage='NO_PERMISSION'
 else try{const preference=await profileMeasurementPreference(db,a);if(!preference.allowed)coverage='NO_PLAN';else if(!preference.enabled)coverage='PAUSED';else{report=await readProfileInteractionReport(db,a,{...query,viewport:'ALL'});coverage=report.summary.available?'AVAILABLE':'NO_DATA'}}catch(reason){if(reason instanceof ProfileError&&reason.status===403)coverage='NO_PLAN';else throw reason}
 // Validate the period even when metrics are unavailable; never silently accept an invalid filter.
 if(!report){const {performanceRange}=await import('@/domain/analytics/performance');try{const range=performanceRange(query,now);if(range.days>180||+range.start<+now-180*86400000)throw new Error()}catch{throw new ProfileError(422,'Escolha um período válido nos últimos 180 dias.')}}
 const published=profileInput.safeParse(page.publication),publishedItems=published.success?published.data.items.filter(i=>i.visible&&published.data.categories.some(g=>g.id===i.categoryId&&g.visible)):[]
 const findings=profileDiagnostics({draft,version:draft.version,unavailable,...(report?.summary.available&&report.revision!==null?{metrics:{revision:report.revision,items:publishedItems,blocks:report.summary.blocks}}:{})})
 const dismissed=findings.length?await db.auditLog.findMany({where:{tenantId:a.tenantId,entityType:'Profile',entityId:page.id,action:'profile.diagnostic.dismissed',createdAt:{gte:new Date(+now-30*86400000)},OR:findings.map(row=>({after:{path:['key'],equals:row.key}}))},select:{after:true}}):[]
 const keys=new Set(dismissed.flatMap(row=>{const parsed=z.object({key:z.string(),ruleVersion:z.literal(DIAGNOSTIC_RULE_VERSION)}).safeParse(row.after);return parsed.success?[parsed.data.key]:[]}))
 return{page:{id:page.id,name:draft.name,version:draft.version},findings:findings.filter(row=>!keys.has(row.key)),ignored:findings.filter(row=>keys.has(row.key)).length,coverage,range:report?.range??null,revision:report?.revision??null,unverifiedUrls:draft.items.filter(i=>i.type!=='CATALOG'&&i.visible).length}
}
export async function dismissProfileDiagnostic(db:PrismaClient,a:ProfileActor,key:string,ruleVersion:number,query:z.infer<typeof diagnosticsQuery>){
 const current=await readProfileDiagnostics(db,a,query)
 if(!current.page)throw new ProfileError(404,'Crie sua página primeiro.')
 if(ruleVersion!==DIAGNOSTIC_RULE_VERSION)throw new ProfileError(409,'As sugestões mudaram. Atualize a página.')
 const finding=current.findings.find(row=>row.key===key)
 return db.$transaction(async tx=>{
  await assertProfileOwner(tx,{...a,permission:'EDIT'})
  await tx.$queryRaw`SELECT id FROM profiles WHERE id=${current.page!.id} AND "tenantId"=${a.tenantId} FOR UPDATE`
  const after={key,ruleVersion},prior=await tx.auditLog.findFirst({where:{tenantId:a.tenantId,entityType:'Profile',entityId:current.page!.id,action:'profile.diagnostic.dismissed',after:{equals:after as Prisma.InputJsonValue},createdAt:{gte:new Date(+profileNow()-30*86400000)}}})
  if(prior)return{ok:true}
  if(!finding)throw new ProfileError(409,'A sugestão mudou. Atualize antes de ignorar.')
  await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.actorId??a.ownerId,action:'profile.diagnostic.dismissed',entityType:'Profile',entityId:current.page!.id,after}})
  return{ok:true}
 })
}
