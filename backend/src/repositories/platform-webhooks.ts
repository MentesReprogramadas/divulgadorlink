import { randomBytes, randomUUID } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { Prisma, type PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { ProfileError } from '@/domain/profiles/profile'
import type { ProfileActor } from '@/domain/access/profile-access'
import { webhookEndpointInput, webhookSignature, webhookBackoff } from '@/domain/notifications/platform-webhook'
import { sealWebhookSecret, openWebhookSecret } from '@/lib/webhook-secret'
import { assertPublicHttps, assertResolvedAddresses, safePost, type DnsResolver } from '@/adapters/http/safe-fetch'
import { assertProfileOwner } from './profiles-repository'
import { env } from '@/env'

const productionDns: DnsResolver = async host => Promise.race([lookup(host,{all:true}).then(rows=>rows.map(row=>row.address)),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('dns timeout')),5000);timer.unref()})])
type Transport = { resolve: DnsResolver; post: (url:string,body:string,headers:Record<string,string>)=>Promise<number> }
const production:Transport={resolve:productionDns,post:(url,body,headers)=>safePost(url,body,headers,productionDns)}
let fixture:Transport|null=null
export function composeWebhooksForTest(transport:Transport|null){if(env.NODE_ENV==='production')throw new Error('Test composition forbidden');fixture=transport}
type Endpoint={id:string;tenantId:string;ownerId:string;url:string;eventTypes:string[];enabled:boolean;secret:string;previousSecret:string|null;previousUntil:Date|null;version:number;createdAt:Date}
const context=(row:Pick<Endpoint,'tenantId'|'ownerId'|'id'>)=>row.tenantId+':'+row.ownerId+':'+row.id
function publicEndpoint(row:Endpoint){return{id:row.id,url:row.url,eventTypes:row.eventTypes,enabled:row.enabled,version:row.version,createdAt:row.createdAt}}
async function lockedOwner(tx:Prisma.TransactionClient,a:ProfileActor){await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;await assertProfileOwner(tx,a)}
async function owned(tx:Prisma.TransactionClient,a:ProfileActor,id:string){const rows=await tx.$queryRaw<Endpoint[]>`SELECT * FROM webhook_endpoints WHERE id=${id} AND "tenantId"=${a.tenantId} AND "ownerId"=${a.ownerId} FOR UPDATE`;if(!rows[0])throw new ProfileError(404,'Integração não encontrada.');return rows[0]}
function version(row:Endpoint,expected:number){if(row.version!==expected)throw new ProfileError(409,'A integração mudou. Atualize antes de continuar.')}
async function validate(url:string){try{assertPublicHttps(url);const addresses=await Promise.race([(fixture??production).resolve(new URL(url).hostname),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('dns timeout')),5000);timer.unref()})]);assertResolvedAddresses(addresses)}catch{throw new ProfileError(400,'Use um endereço HTTPS público e disponível, sem acesso à rede interna.')}}

export async function readWebhooks(db:PrismaClient,a:ProfileActor){
 await assertProfileOwner(db,a)
 const endpoints=await db.$queryRaw<Endpoint[]>`SELECT * FROM webhook_endpoints WHERE "tenantId"=${a.tenantId} AND "ownerId"=${a.ownerId} ORDER BY "createdAt",id`
 const deliveries=await db.$queryRaw<Array<{id:string;eventId:string;endpointId:string;status:string;attempts:number;budget:number;nextAttemptAt:Date;statusCode:number|null;errorCode:string|null;type:string;createdAt:Date}>>`SELECT d.id,d."eventId",d."endpointId",d.status,d.attempts,d.budget,d."nextAttemptAt",d."statusCode",d."errorCode",e.type,e."createdAt" FROM webhook_deliveries d JOIN outbound_events e ON e.id=d."eventId" AND e."tenantId"=d."tenantId" AND e."ownerId"=d."ownerId" WHERE d."tenantId"=${a.tenantId} AND d."ownerId"=${a.ownerId} ORDER BY e."createdAt" DESC,d.id DESC LIMIT 50`
 return{configured:Boolean(env.WEBHOOK_ENCRYPTION_KEY),endpoints:endpoints.map(publicEndpoint),deliveries}
}
export async function saveWebhook(db:PrismaClient,a:ProfileActor,input:z.infer<typeof webhookEndpointInput>,id?:string,expected?:number){
 await validate(input.url)
 return db.$transaction(async tx=>{
  await lockedOwner(tx,a)
  if(id){const row=await owned(tx,a,id);version(row,expected!);await tx.$executeRaw`UPDATE webhook_endpoints SET url=${input.url},"eventTypes"=${input.eventTypes}::text[],enabled=${input.enabled},version=version+1 WHERE id=${id}`;if(!input.enabled||row.url!==input.url||row.eventTypes.some(type=>!input.eventTypes.includes(type as typeof input.eventTypes[number])))await cancelPending(tx,id);await audit(tx,a,id,'updated');return{endpoint:{...publicEndpoint(row),...input,version:row.version+1}}}
  const count=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) FROM webhook_endpoints WHERE "tenantId"=${a.tenantId} AND "ownerId"=${a.ownerId}`
  if(count[0].count>=5n)throw new ProfileError(429,'Use até cinco destinos de integração por espaço.')
  const endpointId=randomUUID(),secret=randomBytes(32).toString('base64url'),sealed=sealWebhookSecret(secret,env.WEBHOOK_ENCRYPTION_KEY,context({id:endpointId,tenantId:a.tenantId,ownerId:a.ownerId}))
  await tx.$executeRaw`INSERT INTO webhook_endpoints(id,"tenantId","ownerId",url,"eventTypes",enabled,secret) VALUES(${endpointId},${a.tenantId},${a.ownerId},${input.url},${input.eventTypes}::text[],${input.enabled},${sealed})`
  await audit(tx,a,endpointId,'created')
  return{endpoint:{id:endpointId,...input,version:1},secret}
 })
}
async function cancelPending(tx:Prisma.TransactionClient,id:string){await tx.$executeRaw`UPDATE webhook_deliveries SET status='CANCELLED',"leaseId"=NULL,"lockedUntil"=NULL WHERE "endpointId"=${id} AND status IN ('PENDING','SENDING')`}
async function audit(tx:Prisma.TransactionClient,a:ProfileActor,id:string,action:string){await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.actorId??a.ownerId,action:'integration.'+action,entityType:'WebhookEndpoint',entityId:id}})}
export async function webhookAction(db:PrismaClient,a:ProfileActor,id:string,action:'disable'|'rotate-secret'|'test'|'delete',expected:number){return db.$transaction(async tx=>{
 await lockedOwner(tx,a);const row=await owned(tx,a,id);version(row,expected)
 await audit(tx,a,id,action)
 if(action==='delete'){await cancelPending(tx,id);await tx.$executeRaw`DELETE FROM webhook_endpoints WHERE id=${id}`;return{deleted:true}}
 if(action==='disable'){await tx.$executeRaw`UPDATE webhook_endpoints SET enabled=false,version=version+1 WHERE id=${id}`;await cancelPending(tx,id);return{saved:true}}
 if(action==='rotate-secret'){
  const secret=randomBytes(32).toString('base64url'),sealed=sealWebhookSecret(secret,env.WEBHOOK_ENCRYPTION_KEY,context(row))
  await tx.$executeRaw`UPDATE webhook_endpoints SET "previousSecret"=secret,"previousUntil"=${new Date(Date.now()+300000)},secret=${sealed},version=version+1 WHERE id=${id}`
  return{secret,graceSeconds:300}
 }
 if(!row.enabled)throw new ProfileError(409,'Ative a integração antes de testar.')
 const recent=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) FROM outbound_events e JOIN webhook_deliveries d ON d."eventId"=e.id WHERE d."endpointId"=${id} AND e.type='integration.test' AND e."createdAt">${new Date(Date.now()-60000)}`
 if(recent[0].count>=1n)throw new ProfileError(429,'Aguarde um minuto antes de testar novamente.')
 const eventId=randomUUID();await tx.$executeRaw`INSERT INTO outbound_events(id,"tenantId","ownerId",type,"occurrenceKey","resourceId") VALUES(${eventId},${a.tenantId},${a.ownerId},'integration.test',${'test:'+eventId},${id})`
 await tx.$executeRaw`INSERT INTO webhook_deliveries(id,"tenantId","ownerId","eventId","endpointId") VALUES(${randomUUID()},${a.tenantId},${a.ownerId},${eventId},${id})`
 return{queued:true,eventId}
})}
export async function retryWebhook(db:PrismaClient,a:ProfileActor,id:string){return db.$transaction(async tx=>{
 await lockedOwner(tx,a)
 const result=await tx.$executeRaw`UPDATE webhook_deliveries d SET status='PENDING',budget=budget+5,"nextAttemptAt"=CURRENT_TIMESTAMP WHERE d.id=${id} AND d."tenantId"=${a.tenantId} AND d."ownerId"=${a.ownerId} AND status='FAILED' AND budget<20 AND EXISTS(SELECT 1 FROM webhook_endpoints e WHERE e.id=d."endpointId" AND e.enabled)`
 if(!result)throw new ProfileError(409,'Entrega indisponível para repetir. Ative o destino e confira o limite de tentativas.')
 await audit(tx,a,id,'retry')
 return{queued:true}
})}

type Job={id:string;eventId:string;endpointId:string;tenantId:string;ownerId:string;attempts:number;budget:number;leaseId:string}
export async function runWebhookCycle(db:PrismaClient,now=new Date(),transport:Transport=fixture??production){
 // PostgreSQL is the durable outbox; BullMQ only wakes this bounded drain.
 const jobs=await db.$transaction(async tx=>{
  await tx.$executeRaw`UPDATE webhook_deliveries d SET status='CANCELLED',"leaseId"=NULL WHERE status IN ('PENDING','SENDING') AND (NOT EXISTS(SELECT 1 FROM webhook_endpoints e WHERE e.id=d."endpointId" AND e.enabled) OR NOT EXISTS(SELECT 1 FROM users u WHERE u.id=d."ownerId" AND u."tenantId"=d."tenantId" AND u.status='ACTIVE'))`
  const rows=await tx.$queryRaw<Job[]>`SELECT * FROM webhook_deliveries WHERE (status='PENDING' AND "nextAttemptAt"<=${now} OR status='SENDING' AND "lockedUntil"<=${now}) AND attempts<budget ORDER BY "nextAttemptAt",id LIMIT 5 FOR UPDATE SKIP LOCKED`
  for(const row of rows){row.leaseId=randomUUID();row.attempts++;await tx.$executeRaw`UPDATE webhook_deliveries SET status='SENDING',attempts=${row.attempts},"lockedUntil"=${new Date(now.getTime()+120000)},"leaseId"=${row.leaseId} WHERE id=${row.id}`}
  await tx.$executeRaw`UPDATE webhook_deliveries SET status='FAILED',"leaseId"=NULL WHERE status='SENDING' AND "lockedUntil"<=${now} AND attempts>=budget`
  return rows
 })
 for(const job of jobs){
  let statusCode:number|null=null,errorCode:string|null=null
  try{
   const [row]=await db.$queryRaw<Endpoint[]>`SELECT e.* FROM webhook_endpoints e JOIN users u ON u.id=e."ownerId" AND u."tenantId"=e."tenantId" WHERE e.id=${job.endpointId} AND e.enabled AND u.status='ACTIVE'`
   if(!row){await db.$executeRaw`UPDATE webhook_deliveries SET status='CANCELLED',"leaseId"=NULL WHERE id=${job.id} AND "leaseId"=${job.leaseId}`;continue}
   const [event]=await db.$queryRaw<Array<{id:string;type:string;resourceId:string;createdAt:Date}>>`SELECT id,type,"resourceId","createdAt" FROM outbound_events WHERE id=${job.eventId} AND "tenantId"=${job.tenantId} AND "ownerId"=${job.ownerId}`
   const body=JSON.stringify({eventId:event.id,type:event.type,occurredAt:event.createdAt.toISOString(),data:{resourceId:event.resourceId}}),timestamp=String(Math.floor(now.getTime()/1000))
   const signatures=['v1='+webhookSignature(openWebhookSecret(row.secret,env.WEBHOOK_ENCRYPTION_KEY,context(row)),timestamp,body)]
   if(row.previousSecret&&row.previousUntil&&row.previousUntil>now)signatures.push('v1='+webhookSignature(openWebhookSecret(row.previousSecret,env.WEBHOOK_ENCRYPTION_KEY,context(row)),timestamp,body))
   statusCode=await transport.post(row.url,body,{'x-temlink-event-id':event.id,'x-temlink-timestamp':timestamp,'x-temlink-signature':signatures.join(',')})
   if(statusCode<200||statusCode>=300)errorCode='HTTP'
  }catch{errorCode='NETWORK_OR_CONFIG'}
  await db.$transaction(async tx=>{
   const changed=await tx.$executeRaw`UPDATE webhook_deliveries SET status=${!errorCode?'DELIVERED':job.attempts>=job.budget?'FAILED':'PENDING'},"statusCode"=${statusCode},"errorCode"=${errorCode},"nextAttemptAt"=${new Date(now.getTime()+webhookBackoff(job.attempts+1))},"leaseId"=NULL,"lockedUntil"=NULL WHERE id=${job.id} AND "leaseId"=${job.leaseId}`
   if(changed)await tx.$executeRaw`INSERT INTO webhook_attempts("deliveryId","tenantId","ownerId",number,"createdAt","statusCode","errorCode") VALUES(${job.id},${job.tenantId},${job.ownerId},${job.attempts},${now},${statusCode},${errorCode}) ON CONFLICT DO NOTHING`
  })
 }
 return{processed:jobs.length}
}
export async function purgeWebhooks(db:PrismaClient,now=new Date()){await db.$executeRaw`DELETE FROM outbound_events WHERE "createdAt"<${new Date(now.getTime()-30*86400000)}`;await db.$executeRaw`UPDATE webhook_endpoints SET "previousSecret"=NULL,"previousUntil"=NULL WHERE "previousUntil"<=${now}`}
