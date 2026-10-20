import {Prisma,type PrismaClient} from '@prisma/client'
import {createHash} from 'node:crypto'
import {RenewalReminderError} from './renewal-reminders'
import {DIGEST_INTERVAL_MS} from '@/domain/notifications/niche-digest'
type Actor={tenantId:string;actorId:string}
type Tx=Prisma.TransactionClient
export const digestTokenHash=(token:string)=>createHash('sha256').update('niche-digest-unsubscribe.v1\0'+token).digest('hex')
export async function lockDigestOwner(tx:Tx,a:Actor){
 await tx.$queryRaw`SELECT id FROM users WHERE id=${a.actorId} AND "tenantId"=${a.tenantId} FOR UPDATE`
 const user=await tx.user.findFirst({where:{id:a.actorId,tenantId:a.tenantId,status:'ACTIVE'},include:{identifiers:true}})
 if(!user)throw new RenewalReminderError(404)
 return user
}
async function view(tx:Tx,a:Actor){
 const user=await tx.user.findFirstOrThrow({where:{id:a.actorId,tenantId:a.tenantId}})
 const [niches,follows]=await Promise.all([tx.niche.findMany({where:{tenantId:a.tenantId,isPublicFacet:true,requiresAge:false},select:{id:true,name:true},orderBy:[{name:'asc'},{id:'asc'}]}),tx.nicheFollow.findMany({where:{tenantId:a.tenantId,userId:a.actorId},select:{nicheId:true}})])
 return {preferences:{emailDigest:user.emailDigest,frequency:user.digestFrequency,expectedVersion:user.notificationVersion,nextDigestAt:user.nextDigestAt?.toISOString()??null},niches:niches.map(row=>({...row,followed:follows.some(f=>f.nicheId===row.id)}))}
}
export async function followedNiches(db:PrismaClient,a:Actor){return db.$transaction(async tx=>{await lockDigestOwner(tx,a);return view(tx,a)})}
export async function followNiche(db:PrismaClient,a:Actor,nicheId:string,follow:boolean){
 return db.$transaction(async tx=>{
  await lockDigestOwner(tx,a)
  const niche=await tx.niche.findFirst({where:{id:nicheId,tenantId:a.tenantId,isPublicFacet:true,requiresAge:false}});if(!niche)throw new RenewalReminderError(404)
  const where={tenantId:a.tenantId,userId:a.actorId,nicheId}
  const previous=await tx.nicheFollow.findUnique({where:{tenantId_userId_nicheId:where}})
  if(!follow)await tx.nicheFollow.deleteMany({where})
  else if(!previous){
   await tx.nicheFollow.create({data:where})
   await tx.$executeRaw`INSERT INTO niche_digest_receipts ("tenantId","userId","nicheId","linkId",reason) SELECT ${a.tenantId},${a.actorId},${nicheId},id,'BASELINE' FROM links WHERE "tenantId"=${a.tenantId} AND "nicheId"=${nicheId} AND status='PUBLISHED' ON CONFLICT DO NOTHING`
  }
  return view(tx,a)
 })
}
export async function digestPreferences(db:PrismaClient,a:Actor,input:{emailDigest:boolean;frequency:'WEEKLY'|'MONTHLY';expectedVersion:number},now=new Date()){
 return db.$transaction(async tx=>{
  const user=await lockDigestOwner(tx,a)
  if(user.notificationVersion!==input.expectedVersion)throw new RenewalReminderError(409,'As preferências mudaram. Atualize e tente de novo.')
  if(input.emailDigest&&!user.identifiers.some(i=>i.tenantId===a.tenantId&&i.kind==='EMAIL'&&i.confirmedAt&&!i.replacedAt))throw new RenewalReminderError(409,'Confirme seu e-mail antes de receber resumos.')
  if(user.emailDigest!==input.emailDigest||user.digestFrequency!==input.frequency){
   await tx.user.update({where:{id:user.id},data:{emailDigest:input.emailDigest,digestFrequency:input.frequency,nextDigestAt:input.emailDigest?new Date(now.getTime()+DIGEST_INTERVAL_MS[input.frequency]):null,notificationVersion:{increment:1}}})
   await tx.nicheDigestBatch.updateMany({where:{tenantId:a.tenantId,userId:a.actorId,status:'PENDING'},data:{status:'SKIPPED',payload:Prisma.DbNull}})
   await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId,action:'notification.digest_preference_changed',entityType:'USER',entityId:a.actorId,after:{enabled:input.emailDigest,frequency:input.frequency}}})
  }
  return view(tx,a)
 })
}
export async function unsubscribeNicheDigest(db:PrismaClient,tenantId:string,token:string,now=new Date()){
 return db.$transaction(async tx=>{
  const batch=await tx.nicheDigestBatch.findFirst({where:{tenantId,tokenHash:digestTokenHash(token),createdAt:{gte:new Date(now.getTime()-30*86400000)}}})
  if(!batch)throw new RenewalReminderError(404,'Este link expirou. Desative os resumos no seu painel.')
  await tx.$queryRaw`SELECT id FROM users WHERE id=${batch.userId} AND "tenantId"=${tenantId} FOR UPDATE`
  await tx.user.updateMany({where:{id:batch.userId,tenantId,emailDigest:true},data:{emailDigest:false,nextDigestAt:null,notificationVersion:{increment:1}}})
  await tx.nicheDigestBatch.updateMany({where:{tenantId,userId:batch.userId,status:'PENDING'},data:{status:'SKIPPED',payload:Prisma.DbNull}})
  return {disabled:true}
 })
}
