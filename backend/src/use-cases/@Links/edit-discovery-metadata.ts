import type {PrismaClient,Prisma} from '@prisma/client'
import {parseDiscovery,type DiscoveryMetadata} from '@/domain/catalog/discovery-metadata'
import {canSubmitLinkFromIdentifiers} from '@/use-cases/@Auth/confirm-identifier'
export class DiscoveryError extends Error {constructor(public readonly status:number,message:string){super(message)}}
async function owned(db:Pick<Prisma.TransactionClient,'user'|'link'>,actor:{tenantId:string;ownerId:string},linkId:string){
 const user=await db.user.findFirst({where:{id:actor.ownerId,tenantId:actor.tenantId},include:{identifiers:true}})
 if(!user||!canSubmitLinkFromIdentifiers(user.status,user.identifiers))throw new DiscoveryError(403,'Confirme seu e-mail e verifique o estado da conta.')
 const link=await db.link.findFirst({where:{id:linkId,tenantId:actor.tenantId,ownerId:actor.ownerId},select:{id:true,status:true,cityId:true,languageTag:true,modality:true,discoveryVersion:true}})
 if(!link)throw new DiscoveryError(404,'Link não encontrado.')
 if(!['PUBLISHED','PENDING_MODERATION'].includes(link.status))throw new DiscoveryError(409,'Este link não pode ser editado agora.')
 return link
}
export async function readDiscoveryMetadata(db:PrismaClient,actor:{tenantId:string;ownerId:string},linkId:string){const link=await owned(db,actor,linkId);return {metadata:parseDiscovery(link),version:link.discoveryVersion}}
export async function editDiscoveryMetadata(db:PrismaClient,actor:{tenantId:string;ownerId:string},linkId:string,metadata:DiscoveryMetadata,expectedVersion:number,requestId:string){
 const next=parseDiscovery(metadata)
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM links WHERE id=${linkId} AND "tenantId"=${actor.tenantId} AND "ownerId"=${actor.ownerId} FOR UPDATE`
  const link=await owned(tx,actor,linkId)
  const current=parseDiscovery(link),same=JSON.stringify(current)===JSON.stringify(next)
  if(link.discoveryVersion!==expectedVersion){
   if(same&&link.discoveryVersion===expectedVersion+1)return {metadata:current,version:link.discoveryVersion}
   throw new DiscoveryError(409,'Os dados mudaram em outra aba. Recarregue antes de salvar.')
  }
  if(same)return {metadata:current,version:link.discoveryVersion}
  const saved=await tx.link.update({where:{id:link.id},data:{...next,discoveryVersion:{increment:1}}})
  await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'link.discovery.updated',entityType:'link',entityId:link.id,before:{...current,version:link.discoveryVersion},after:{...next,version:saved.discoveryVersion},requestId}})
  return {metadata:next,version:saved.discoveryVersion}
 })
}
