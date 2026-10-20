import {randomBytes,randomUUID} from 'node:crypto'
import {Prisma,type PrismaClient} from '@prisma/client'
import {canSubmitLinkFromIdentifiers} from '@/use-cases/@Auth/confirm-identifier'
import {RedirectError} from '@/use-cases/@Redirects/validate-destination'
import {assertPublicHttps} from '@/adapters/http/safe-fetch'
import type {OwnershipFetch} from '@/adapters/http/ownership-fetch'
import {challengeMinutes,verificationDays,evidenceDays,ownershipFile,ownershipHash,matchesOwnership,validOwnership} from '@/domain/verification/ownership'
type Db=Prisma.TransactionClient
type Actor={tenantId:string;ownerId:string;actorId?:string}
type Challenge={id:string;ownerId:string;revisionId:string;destinationUrl:string;tokenHash:string;expiresAt:Date;consumedAt:Date|null;verifiedAt:Date|null;validUntil:Date|null;revokedAt:Date|null}
async function owned(db:Db,a:Actor,id:string,write=false){
 const user=await db.user.findFirst({where:{id:a.ownerId,tenantId:a.tenantId},include:{identifiers:true}})
 if(!user||user.status!=='ACTIVE'||write&&!canSubmitLinkFromIdentifiers(user.status,user.identifiers))throw new RedirectError(403,'Confirme seu e-mail antes de continuar.')
 const handle=await db.redirectHandle.findFirst({where:{id,tenantId:a.tenantId,ownerId:a.ownerId}})
 if(!handle)throw new RedirectError(404,'Convite não encontrado.')
 const revision=handle.activeRevisionId?await db.redirectDestination.findFirst({where:{id:handle.activeRevisionId,tenantId:a.tenantId,status:'APPROVED',handleId:id}}):null
 return {handle,revision}
}
async function lock(db:Db,a:Actor,id:string){await db.$queryRaw`SELECT id FROM redirect_handles WHERE id=${id} AND "tenantId"=${a.tenantId} AND "ownerId"=${a.ownerId} FOR UPDATE`;return owned(db,a,id,true)}
async function evidence(db:Db,tenantId:string,id:string){return (await db.$queryRaw<Challenge[]>`SELECT * FROM ownership_challenges WHERE "tenantId"=${tenantId} AND "handleId"=${id} AND "verifiedAt" IS NOT NULL ORDER BY "verifiedAt" DESC LIMIT 1`)[0]}
function projection(row:Challenge|undefined,current:{handle:{ownerId:string;activeRevisionId:string|null;disabled:boolean};revision:{destinationUrl:string}|null},now:Date){
 if(!row||!current.revision||!validOwnership(row,{...current.handle,destinationUrl:current.revision.destinationUrl},now))return null
 return {status:'VERIFIED',scope:'Controle do domínio do destino',method:'HTTPS_FILE',domain:new URL(row.destinationUrl).hostname,destinationUrl:row.destinationUrl,verifiedAt:row.verifiedAt,expiresAt:row.validUntil}
}
export async function readOwnership(db:PrismaClient,a:Actor,id:string,now=new Date()){
 const current=await owned(db,a,id),fileUrl=current.revision&&!current.handle.disabled?ownershipFile(current.revision.destinationUrl):null
 return {supported:!!fileUrl,fileUrl,revisionId:current.revision?.id??null,verification:projection(await evidence(db,a.tenantId,id),current,now)}
}
export async function publicOwnership(db:PrismaClient,tenantId:string,id:string,age=false,now=new Date()){
 const handle=await db.redirectHandle.findFirst({where:{id,tenantId,disabled:false,owner:{status:'ACTIVE',tenantId}}})
 if(!handle?.activeRevisionId)return {verification:null}
 const revision=await db.redirectDestination.findFirst({where:{id:handle.activeRevisionId,handleId:id,tenantId,status:'APPROVED'}})
 if(!revision||revision.requiresAge&&!age)return {verification:null}
 return {verification:projection(await evidence(db,tenantId,id),{handle,revision},now)}
}
export async function createOwnership(db:PrismaClient,a:Actor,id:string,revisionId:string,now=new Date()){
 const token=randomBytes(32).toString('hex'),hash=ownershipHash(token),key=randomUUID(),expiresAt=new Date(now.getTime()+challengeMinutes*60000)
 const fileUrl=await db.$transaction(async tx=>{
  const {handle,revision}=await lock(tx,a,id)
  if(handle.disabled||!revision||revision.id!==revisionId)throw new RedirectError(409,'O destino mudou. Atualize antes de comprovar.')
  try{assertPublicHttps(revision.destinationUrl)}catch{throw new RedirectError(422,'O destino precisa ser um endereço HTTPS público.')}
  const file=ownershipFile(revision.destinationUrl);if(!file)throw new RedirectError(422,'Este serviço não oferece um método de comprovação compatível.')
  const recent=await tx.$queryRaw<{count:bigint}[]>`SELECT COUNT(*) FROM ownership_challenges WHERE "tenantId"=${a.tenantId} AND "handleId"=${id} AND "createdAt">${new Date(now.getTime()-3600000)}`
  if(Number(recent[0].count)>=5)throw new RedirectError(429,'Aguarde antes de criar outro desafio.')
  await tx.$executeRaw`UPDATE ownership_challenges SET "consumedAt"=${now} WHERE "handleId"=${id} AND "consumedAt" IS NULL`
  await tx.$executeRaw`INSERT INTO ownership_challenges(id,"tenantId","handleId","ownerId","revisionId","destinationUrl","tokenHash","createdAt","expiresAt") VALUES(${key},${a.tenantId},${id},${a.ownerId},${revision.id},${revision.destinationUrl},${hash},${now},${expiresAt})`
  await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.ownerId,action:'ownership.challenge.created',entityType:'RedirectHandle',entityId:id,after:{challengeId:key,method:'HTTPS_FILE'}}})
  return file
 })
 return {id:key,fileUrl,content:token,expiresAt}
}
export async function verifyOwnership(db:PrismaClient,a:Actor,id:string,challengeId:string,fetchFile:OwnershipFetch,now=new Date()){
 const current=await owned(db,a,id,true),row=(await db.$queryRaw<Challenge[]>`SELECT * FROM ownership_challenges WHERE id=${challengeId} AND "tenantId"=${a.tenantId} AND "handleId"=${id} AND "ownerId"=${a.ownerId}`)[0]
 if(!row||row.consumedAt||row.expiresAt<=now)throw new RedirectError(409,'Desafio vencido ou utilizado. Crie outro desafio.')
 if(current.handle.disabled||current.handle.activeRevisionId!==row.revisionId||current.revision?.destinationUrl!==row.destinationUrl)throw new RedirectError(409,'O destino mudou. Crie outro desafio.')
 const file=ownershipFile(row.destinationUrl);if(!file)throw new RedirectError(422,'Método indisponível para este destino.')
 let content:string|null;try{content=await fetchFile(file)}catch{throw new RedirectError(503,'Não foi possível consultar o arquivo. Tente novamente.')}
 now=new Date(Math.max(now.getTime(),Date.now()))
 if(!content||!matchesOwnership(content,row.tokenHash))throw new RedirectError(422,'Arquivo não encontrado ou conteúdo diferente. Confira o arquivo e tente novamente.')
 await db.$transaction(async tx=>{
  const latest=await lock(tx,a,id)
  if(latest.handle.disabled||latest.handle.activeRevisionId!==row.revisionId||latest.revision?.destinationUrl!==row.destinationUrl)throw new RedirectError(409,'O destino mudou durante a verificação.')
  const used=await tx.$executeRaw`UPDATE ownership_challenges SET "consumedAt"=${now},"verifiedAt"=${now},"validUntil"=${new Date(now.getTime()+verificationDays*86400000)} WHERE id=${row.id} AND "consumedAt" IS NULL AND "expiresAt">${now}`
  if(used!==1)throw new RedirectError(409,'Desafio já utilizado ou vencido.')
  await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.ownerId,action:'ownership.verified',entityType:'RedirectHandle',entityId:id,after:{challengeId,scope:'destination-domain',method:'HTTPS_FILE'}}})
 });return readOwnership(db,a,id,now)
}
export async function revokeOwnership(db:PrismaClient,a:Actor,id:string,now=new Date()){
 await db.$transaction(async tx=>{await lock(tx,a,id);await invalidateOwnership(tx,id,now);await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.ownerId,action:'ownership.revoked',entityType:'RedirectHandle',entityId:id}})})
 return readOwnership(db,a,id,now)
}
export async function invalidateOwnership(db:Db,id:string,now:Date){await db.$executeRaw`UPDATE ownership_challenges SET "revokedAt"=COALESCE("revokedAt",${now}),"consumedAt"=COALESCE("consumedAt",${now}) WHERE "handleId"=${id}`}
export async function purgeOwnership(db:PrismaClient,now=new Date()){await db.$executeRaw`DELETE FROM ownership_challenges WHERE "createdAt"<${new Date(now.getTime()-evidenceDays*86400000)}`}
