import {Prisma,type PrismaClient} from '@prisma/client'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {DIGEST_INTERVAL_MS,selectDigestLinks} from '@/domain/notifications/niche-digest'
import {nicheDigestEmail,emailBrand,siteOrigin} from '@/adapters/notifications/email/templates'
import {deliverQueuedEmail} from '@/adapters/notifications/renewal-delivery'
import type {OutboundEmail} from '@/adapters/notifications/resend-mailer'
import {digestTokenHash,lockDigestOwner} from './niche-follows'
import {logDomainEvent} from '@/observability/logger'
type Tx=Prisma.TransactionClient
type Actor={tenantId:string;actorId:string}
const MAX_AGE=23*3600000
export type DigestCycleInput={enabled?:boolean;now?:Date;deliver?:(email:OutboundEmail)=>Promise<void>}
async function eligible(tx:Tx,a:Actor,ids?:string[]){
 const rows=await tx.link.findMany({where:{tenantId:a.tenantId,status:'PUBLISHED',...(ids?{id:{in:ids}}:{}),niche:{tenantId:a.tenantId,requiresAge:false,isPublicFacet:true,followers:{some:{tenantId:a.tenantId,userId:a.actorId}}},network:{tenantId:a.tenantId,requiresAge:false},OR:[{ownerId:null},{owner:{tenantId:a.tenantId,status:'ACTIVE'}}],digestReceipts:{none:{tenantId:a.tenantId,userId:a.actorId}}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:20,select:{id:true,tenantId:true,nicheId:true,status:true,name:true,updatedAt:true,niche:{select:{requiresAge:true}},network:{select:{requiresAge:true}},owner:{select:{status:true}}}})
 // SQL bounds the candidate page; the domain policy also guards the adapter projection.
 return selectDigestLinks(rows.map(row=>({...row,requiresAge:row.niche.requiresAge||row.network.requiresAge,ownerActive:!row.owner||row.owner.status==='ACTIVE'})),{enabled:true,active:true,tenantId:a.tenantId,followed:new Set(rows.map(row=>row.nicheId)),seen:new Set()})
}
const fingerprint=(rows:Awaited<ReturnType<typeof eligible>>)=>createHash('sha256').update(JSON.stringify(rows)).digest('hex')
const emailIdentifier=(user:{tenantId:string;identifiers:Array<{tenantId:string;kind:string;confirmedAt:Date|null;replacedAt:Date|null;normalizedValue:string}>})=>user.identifiers.find(row=>row.tenantId===user.tenantId&&row.kind==='EMAIL'&&row.confirmedAt&&!row.replacedAt)
async function prepare(db:PrismaClient,a:Actor,now:Date){
 await db.$transaction(async tx=>{
  const user=await lockDigestOwner(tx,a)
  if(!user.emailDigest||!user.nextDigestAt||user.nextDigestAt>now||await tx.nicheDigestBatch.findFirst({where:{tenantId:a.tenantId,userId:a.actorId,status:'PENDING'}}))return
  const identifier=emailIdentifier(user),interval=DIGEST_INTERVAL_MS[user.digestFrequency as keyof typeof DIGEST_INTERVAL_MS]
  if(!interval)throw new Error('Frequência inválida')
  await tx.user.update({where:{id:user.id},data:{nextDigestAt:new Date(now.getTime()+interval)}})
  if(!identifier)return
  const links=await eligible(tx,a);if(!links.length)return
  const tenant=await tx.tenant.findUniqueOrThrow({where:{id:a.tenantId}}),id=randomUUID(),token=randomBytes(32).toString('hex'),origin=siteOrigin(tenant.host)
  const body=nicheDigestEmail({brand:emailBrand({name:tenant.name}),links:links.map(link=>({name:link.name,url:origin+'/link/'+encodeURIComponent(link.id)})),unsubscribeUrl:origin+'/resumos/cancelar?token='+token,preferencesUrl:origin+'/painel/interesses'})
  const payload:OutboundEmail={...body,to:identifier.normalizedValue,kind:'niche_digest',idempotencyKey:'niche-digest/'+id}
  await tx.nicheDigestBatch.create({data:{id,tenantId:a.tenantId,userId:a.actorId,createdAt:now,nextAttemptAt:now,tokenHash:digestTokenHash(token),fingerprint:fingerprint(links),linkIds:links.map(link=>link.id),payload:payload as unknown as Prisma.InputJsonValue}})
 },{timeout:10000})
}
function emailPayload(value:Prisma.JsonValue):OutboundEmail{
 if(!value||typeof value!=='object'||Array.isArray(value)||value.kind!=='niche_digest'||['to','html','text','subject','idempotencyKey'].some(key=>typeof value[key]!=='string'))throw new Error('Resumo inválido')
 return value as unknown as OutboundEmail
}
export async function runNicheDigestCycle(db:PrismaClient,input:DigestCycleInput={}){
 const enabled=input.enabled??process.env.NICHE_DIGESTS_ENABLED==='1',clock=()=>input.now??new Date(),now=clock()
 // Cleanup continues with sending disabled; stopped workers perform it on their next cycle.
 await db.nicheDigestBatch.updateMany({where:{status:'PENDING',...(enabled?{createdAt:{lte:new Date(now.getTime()-MAX_AGE)}}:{})},data:{status:'SKIPPED',payload:Prisma.DbNull}})
 await db.nicheDigestBatch.deleteMany({where:{status:{not:'PENDING'},createdAt:{lt:new Date(now.getTime()-30*86400000)}}})
 if(!enabled)return {sent:0}
 const users=await db.user.findMany({where:{emailDigest:true,status:'ACTIVE',nextDigestAt:{lte:now},nicheDigestBatches:{none:{status:'PENDING'}}},orderBy:[{nextDigestAt:'asc'},{id:'asc'}],take:25,select:{id:true,tenantId:true}})
 for(const user of users)await prepare(db,{tenantId:user.tenantId,actorId:user.id},now)
 const pending=await db.nicheDigestBatch.findMany({where:{status:'PENDING',attempts:{lt:5},nextAttemptAt:{lte:now}},orderBy:[{nextAttemptAt:'asc'},{id:'asc'}],take:25,select:{id:true,tenantId:true,userId:true}})
 let sent=0
 for(const entry of pending){
  const delivered=await db.$transaction(async tx=>{
   // Preference changes and unsubscribe acquire the same user lock. Link locks prevent publication changes during delivery.
   await tx.$queryRaw`SELECT id FROM users WHERE id=${entry.userId} AND "tenantId"=${entry.tenantId} FOR UPDATE`
   await tx.$queryRaw`SELECT id FROM niche_digest_batches WHERE id=${entry.id} FOR UPDATE`
   const batch=await tx.nicheDigestBatch.findUniqueOrThrow({where:{id:entry.id}})
   if(batch.status!=='PENDING'||batch.nextAttemptAt>clock())return false
   await tx.$queryRaw`SELECT id FROM links WHERE id=ANY(${batch.linkIds}::text[]) AND "tenantId"=${entry.tenantId} ORDER BY id FOR SHARE`
   const user=await tx.user.findFirst({where:{id:entry.userId,tenantId:entry.tenantId,status:'ACTIVE'},include:{identifiers:true}}),identifier=user?emailIdentifier(user):null
   const current=await eligible(tx,{tenantId:entry.tenantId,actorId:entry.userId},batch.linkIds),payload=emailPayload(batch.payload)
   if(!user?.emailDigest||!identifier||identifier.normalizedValue!==payload.to||clock().getTime()-batch.createdAt.getTime()>=MAX_AGE||current.length!==batch.linkIds.length||fingerprint(current)!==batch.fingerprint){await tx.nicheDigestBatch.update({where:{id:batch.id},data:{status:'SKIPPED',payload:Prisma.DbNull}});return false}
   await tx.$queryRaw`SELECT id FROM user_identifiers WHERE "userId"=${entry.userId} AND "tenantId"=${entry.tenantId} ORDER BY id FOR SHARE`
   const confirmed=await tx.userIdentifier.findFirst({where:{userId:user.id,tenantId:user.tenantId,kind:'EMAIL',normalizedValue:payload.to,confirmedAt:{not:null},replacedAt:null}})
   if(!confirmed){await tx.nicheDigestBatch.update({where:{id:batch.id},data:{status:'SKIPPED',payload:Prisma.DbNull}});return false}
   const attempts=batch.attempts+1
   try{await(input.deliver??deliverQueuedEmail)(payload)}catch{
    await tx.nicheDigestBatch.update({where:{id:batch.id},data:{attempts,status:attempts>=5?'FAILED':'PENDING',...(attempts>=5?{payload:Prisma.DbNull}:{}),nextAttemptAt:new Date(clock().getTime()+60000*2**(attempts-1))}});logDomainEvent('niche.digest.failed',{entity:batch.id,result:'provider_error'});return false
   }
   await tx.nicheDigestReceipt.createMany({data:current.map(link=>({tenantId:entry.tenantId,userId:entry.userId,nicheId:link.nicheId,linkId:link.id,reason:'SENT',seenAt:clock()})),skipDuplicates:true})
   await tx.nicheDigestBatch.update({where:{id:batch.id},data:{attempts,status:'SENT',sentAt:clock(),payload:Prisma.DbNull}});return true
  },{timeout:15000,maxWait:5000})
  if(delivered)sent++
 }
 await db.nicheDigestBatch.deleteMany({where:{status:{not:'PENDING'},createdAt:{lt:new Date(now.getTime()-30*86400000)}}})
 logDomainEvent('niche.digest.cycle',{sent,result:'completed'})
 return {sent}
}
