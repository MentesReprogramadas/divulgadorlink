import {createHmac,randomUUID} from 'node:crypto'
import {Prisma,type PrismaClient} from '@prisma/client'
import {env} from '@/env'
import {ProfileError} from '@/domain/profiles/profile'
import {profileInput} from '@/domain/profiles/profile-input'
import {buttonTestInput,buttonTestResult,buttonVariant,type ButtonTestConfig} from '@/domain/profiles/button-test'
import type {ProfileActor} from '@/domain/access/profile-access'
import {assertProfileOwner,publicProfileProjection} from './profiles-repository'
import {profilePaidCapabilityCoverage} from './profile-capability-coverage'
import {profileBillingRuntime} from '@/lib/profile-billing'
import {profileNow} from '@/lib/profile-clock'
import {readProfileInteraction} from '@/lib/profile-interaction-token'
type Experiment={id:string;profileId:string;tenantId:string;ownerId:string;revisionId:number;config:ButtonTestConfig;status:'RUNNING'|'COMPLETE'|'STOPPED';version:number;startedAt:Date;endsAt:Date;stoppedAt:Date|null}
type Counts={variant:number;exposures:bigint;clicks:bigint}
const context=(actor:ProfileActor)=>Prisma.sql`"tenantId"=${actor.tenantId} AND "ownerId"=${actor.ownerId}`
async function counts(tx:Prisma.TransactionClient,id:string){const rows=await tx.$queryRaw<Counts[]>`SELECT variant,COUNT(*)::bigint AS exposures,COUNT("clickedAt")::bigint AS clicks FROM profile_button_test_visits WHERE "experimentId"=${id}::uuid GROUP BY variant`;return[0,1].map(variant=>({exposures:Number(rows.find(row=>row.variant===variant)?.exposures??0),clicks:Number(rows.find(row=>row.variant===variant)?.clicks??0)}))}
async function finish(tx:Prisma.TransactionClient,row:Experiment,now:Date,revision:number|null){
 const values=await counts(tx,row.id)
 if(row.status==='RUNNING'&&(row.endsAt<=now||revision!==row.revisionId)){const status=revision===row.revisionId?'COMPLETE':'STOPPED';await tx.$executeRaw`UPDATE profile_button_tests SET status=${status},"stoppedAt"=${now},version=version+1 WHERE id=${row.id}::uuid AND status='RUNNING'`;row={...row,status,stoppedAt:now,version:row.version+1}}
 return{...row,counts:values,result:buttonTestResult(row.config,values,row.status!=='RUNNING',row.status==='STOPPED')}
}
async function measurement(tx:Prisma.TransactionClient,row:{id:string;tenantId:string;ownerId:string},now:Date){return Boolean((await tx.profileMeasurement.findUnique({where:{profileId:row.id}}))?.enabled&&(await profilePaidCapabilityCoverage(tx,row,profileBillingRuntime().delivered,now,'profile.analytics')).enabled)}
export async function listButtonTests(db:PrismaClient,actor:ProfileActor){return db.$transaction(async tx=>{
 await assertProfileOwner(tx,actor);const initial=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:actor.tenantId,ownerId:actor.ownerId}}});if(!initial)return{experiments:[],allowed:false}
 await tx.$queryRaw`SELECT id FROM profiles WHERE id=${initial.id} FOR UPDATE`
 const p=await tx.profile.findUniqueOrThrow({where:{id:initial.id}})
 const rows=await tx.$queryRaw<Experiment[]>(Prisma.sql`SELECT * FROM profile_button_tests WHERE ${context(actor)} AND "profileId"=${p.id} ORDER BY "startedAt" DESC LIMIT 20`),now=profileNow()
 const experiments=[];for(const row of rows)experiments.push(await finish(tx,{...row,config:buttonTestInput.parse(row.config)},now,p.publishedVersion))
 const reportAllowed=(await profilePaidCapabilityCoverage(tx,p,profileBillingRuntime().delivered,now,'profile.analytics')).enabled
 return{experiments:reportAllowed?experiments:experiments.map(row=>({...row,counts:row.counts.map(()=>({exposures:null,clicks:null})),result:{...row.result,status:'UNAVAILABLE',winner:null,enough:false,rates:[null,null]}})),allowed:await measurement(tx,p,now)}
})}
export async function startButtonTest(db:PrismaClient,actor:ProfileActor,expectedVersion:number){return db.$transaction(async tx=>{
 await assertProfileOwner(tx,actor,true);await tx.$queryRaw`SELECT id FROM profiles WHERE "tenantId"=${actor.tenantId} AND "ownerId"=${actor.ownerId} FOR UPDATE`
 const p=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:actor.tenantId,ownerId:actor.ownerId}}}),now=profileNow()
 if(!p?.publication||p.version!==expectedVersion||p.publishedVersion!==expectedVersion)throw new ProfileError(409,'Publique o rascunho aprovado antes de iniciar o teste.')
 const config=profileInput.parse(p.publishedDraft??p.publication).buttonTest;if(!config)throw new ProfileError(422,'Configure as duas versões no rascunho e publique primeiro.')
 const view=await publicProfileProjection(tx,actor.tenantId,p.slug,actor.age)
 if(view.restricted||!view.items.some(item=>item.id===config.blockId&&!item.event))throw new ProfileError(422,'O botão precisa estar disponível na página.')
 if(!await measurement(tx,p,now))throw new ProfileError(403,'Ative a medição da página em um plano com métricas.')
 const active=(await tx.$queryRaw<Experiment[]>`SELECT * FROM profile_button_tests WHERE "profileId"=${p.id} AND status='RUNNING'`)[0]
 if(active){const current=await finish(tx,{...active,config:buttonTestInput.parse(active.config)},now,p.publishedVersion);if(current.status==='RUNNING'){if(current.revisionId===p.publishedVersion&&JSON.stringify(current.config)===JSON.stringify(config))return{id:current.id};throw new ProfileError(409,'Encerre o teste ativo primeiro.')}}
 const id=randomUUID(),endsAt=new Date(+now+config.durationDays*86400000)
 await tx.$executeRaw`INSERT INTO profile_button_tests(id,"profileId","tenantId","ownerId","revisionId",config,status,"startedAt","endsAt") VALUES(${id}::uuid,${p.id},${actor.tenantId},${actor.ownerId},${p.publishedVersion},${JSON.stringify(config)}::jsonb,'RUNNING',${now},${endsAt})`
 await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.auditActorId??actor.actorId??actor.ownerId,action:'PROFILE_BUTTON_TEST_START',entityType:'Profile',entityId:p.id,after:{experimentId:id,revision:p.publishedVersion}}});return{id}
})}
export async function stopButtonTest(db:PrismaClient,actor:ProfileActor,id:string,version:number){return db.$transaction(async tx=>{
 await assertProfileOwner(tx,actor,true);const row=(await tx.$queryRaw<Experiment[]>(Prisma.sql`SELECT * FROM profile_button_tests WHERE id=${id}::uuid AND ${context(actor)} FOR UPDATE`))[0]
 if(!row)throw new ProfileError(404,'Teste não encontrado.');if(row.version!==version)throw new ProfileError(409,'O teste mudou. Atualize os dados.')
 if(row.status==='RUNNING'){await tx.$executeRaw`UPDATE profile_button_tests SET status='STOPPED',"stoppedAt"=${profileNow()},version=version+1 WHERE id=${id}::uuid`;await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.auditActorId??actor.actorId??actor.ownerId,action:'PROFILE_BUTTON_TEST_STOP',entityType:'Profile',entityId:row.profileId,after:{experimentId:id}}})}return{ok:true}
})}
/** A visit is the existing consented session cookie; no new cross-visit identifier is created. */
export async function publicButtonTest(db:PrismaClient,tenantId:string,slug:string,session:string,age:boolean,input?:{id:string;variant:0|1;revisionId:number;surfaceToken:string;kind:'EXPOSURE'|'CLICK'}){return db.$transaction(async tx=>{
 const initial=await tx.profile.findUnique({where:{tenantId_slug:{tenantId,slug}}}),now=profileNow();if(!initial)return{assignment:null,counted:false}
 await tx.$queryRaw`SELECT id FROM users WHERE id=${initial.ownerId} AND "tenantId"=${tenantId} FOR SHARE`
 await tx.$queryRaw`SELECT id FROM profiles WHERE id=${initial.id} FOR UPDATE`
 const p=await tx.profile.findUniqueOrThrow({where:{id:initial.id}})
 const raw=(await tx.$queryRaw<Experiment[]>`SELECT * FROM profile_button_tests WHERE "profileId"=${p.id} AND status='RUNNING'`)[0];if(!raw)return{assignment:null,counted:false}
 const row=await finish(tx,{...raw,config:buttonTestInput.parse(raw.config)},now,p.publishedVersion)
 if(row.status!=='RUNNING')return{assignment:null,counted:false}
 if(p.publishedVersion!==row.revisionId||!p.publication){await tx.$executeRaw`UPDATE profile_button_tests SET status='STOPPED',"stoppedAt"=${now},version=version+1 WHERE id=${row.id}::uuid`;return{assignment:null,counted:false}}
 if(!await measurement(tx,p,now))return{assignment:null,counted:false}
 const view=await publicProfileProjection(tx,tenantId,slug,age);if(view.restricted||!view.items.some(item=>item.id===row.config.blockId))return{assignment:null,counted:false}
 const variant=buttonVariant(row.id,session,env.JWT_SECRET),assignment={id:row.id,variant,revisionId:row.revisionId,blockId:row.config.blockId,label:row.config.labels[variant]}
 if(!input)return{assignment,counted:false}
 if(input.id!==row.id||input.variant!==variant||input.revisionId!==row.revisionId||!readProfileInteraction(input.surfaceToken,{tenantId,profileId:p.id,revisionId:row.revisionId},env.JWT_SECRET,now))throw new ProfileError(422,'A sessão do teste mudou. Recarregue a página.')
 const sessionHash=createHmac('sha256',env.JWT_SECRET).update(JSON.stringify(['button-test-session.v1',tenantId,row.id,session])).digest('hex')
 const changed=input.kind==='EXPOSURE'?await tx.$executeRaw`INSERT INTO profile_button_test_visits(id,"experimentId","tenantId","profileId","ownerId","sessionHash",variant,"exposedAt") VALUES(${randomUUID()}::uuid,${row.id}::uuid,${tenantId},${p.id},${p.ownerId},${sessionHash},${variant},${now}) ON CONFLICT("experimentId","sessionHash") DO NOTHING`:await tx.$executeRaw`UPDATE profile_button_test_visits SET "clickedAt"=${now} WHERE "experimentId"=${row.id}::uuid AND "sessionHash"=${sessionHash} AND variant=${variant} AND "clickedAt" IS NULL`
 return{assignment,counted:changed>0}
})}
export function purgeButtonTests(db:PrismaClient,now=new Date()){return db.$executeRaw`DELETE FROM profile_button_tests WHERE "startedAt"<${new Date(+now-180*86400000)}`}
