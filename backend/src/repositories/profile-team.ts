import {agencyDerivedAccess} from './agency-access-guard'
import {Prisma,type PrismaClient} from '@prisma/client'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {ProfileError} from '@/domain/profiles/profile'
import {env} from '@/env'
import {profileNow} from '@/lib/profile-clock'
import {sendInvitationEmail} from '@/use-cases/@Notifications/invitation-mail'
import {invitationAvailable,invitationToken,tokenDigest,recipientDigest,permits,type ProfileActor,type ProfilePermission} from '@/domain/access/profile-access'
export const inviteInput=z.object({resourceId:z.string().uuid(),email:z.string().trim().email().max(254),role:z.enum(['EDITOR','VIEWER']),requestKey:z.string().uuid()}).strict()
export const acceptInput=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict()
export async function assertMembership(tx:Prisma.TransactionClient,actor:ProfileActor,permission:ProfilePermission){
 if(!actor.actorId||actor.actorId===actor.ownerId)return
 const user=await tx.user.findFirst({where:{id:actor.actorId,tenantId:actor.tenantId,status:'ACTIVE'},include:{identifiers:true}})
 await tx.$queryRaw`SELECT id FROM profile_memberships WHERE "profileId"=${actor.profileId??''} AND "tenantId"=${actor.tenantId} AND "userId"=${actor.actorId} FOR SHARE`
 const member=await tx.profileMembership.findUnique({where:{profileId_userId:{profileId:actor.profileId??'',userId:actor.actorId}}})
 if(!user||!member||member.ownerId!==actor.ownerId||!permits(member.role as 'EDITOR'|'VIEWER',member.status,permission)||!await agencyDerivedAccess(tx,member.id,member.version))throw new ProfileError(403,'Você não tem permissão para esta página. Peça acesso ao proprietário.')
 if(permission==='PUBLISH'&&!user.identifiers.some(row=>row.kind==='EMAIL'&&row.confirmedAt))throw new ProfileError(403,'Confirme seu e-mail antes de publicar.')
}
export async function resolveProfileActor(db:PrismaClient,actor:ProfileActor,id:string,permission:ProfilePermission):Promise<ProfileActor>{
 if(!z.string().uuid().safeParse(id).success)throw new ProfileError(400,'Página inválida.')
 const profile=await db.profile.findFirst({where:{id,tenantId:actor.tenantId},select:{id:true,ownerId:true}})
 if(!profile)throw new ProfileError(404,'Página não encontrada.')
 const next={...actor,actorId:actor.ownerId,ownerId:profile.ownerId,profileId:id,permission}
 await db.$transaction(tx=>assertMembership(tx,next,permission));return next
}
async function active(tx:Prisma.TransactionClient,actor:ProfileActor){const user=await tx.user.findFirst({where:{id:actor.actorId??actor.ownerId,tenantId:actor.tenantId,status:'ACTIVE'},include:{identifiers:true}});if(!user)throw new ProfileError(403,'Conta sem acesso.');return user}
async function own(tx:Prisma.TransactionClient,actor:ProfileActor){await active(tx,actor);if(actor.actorId&&actor.actorId!==actor.ownerId)throw new ProfileError(403,'Apenas o proprietário pode administrar a equipe.');const profile=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:actor.tenantId,ownerId:actor.ownerId}}});if(!profile)throw new ProfileError(404,'Crie sua página antes de convidar.');return profile}
const invitationDto=(row:{id:string;role:string;expiresAt:Date;usedAt:Date|null;revokedAt:Date|null})=>({id:row.id,role:row.role,expiresAt:row.expiresAt.toISOString(),status:row.revokedAt?'REVOKED':row.usedAt?'ACCEPTED':row.expiresAt<=profileNow()?'EXPIRED':'PENDING'})
async function audit(tx:Prisma.TransactionClient,actor:ProfileActor,profileId:string,action:string,after:Prisma.InputJsonObject){await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.actorId??actor.ownerId,entityType:'Profile',entityId:profileId,action,after}})}
export async function listTeam(db:PrismaClient,actor:ProfileActor){return db.$transaction(async tx=>{await active(tx,actor);const profile=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:actor.tenantId,ownerId:actor.ownerId}}});const candidates=await tx.profileMembership.findMany({where:{tenantId:actor.tenantId,userId:actor.ownerId,status:'ACTIVE',profile:{owner:{status:'ACTIVE'}}},select:{id:true,version:true,role:true,profile:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'}});const shared=[];for(const row of candidates)if(await agencyDerivedAccess(tx,row.id,row.version))shared.push({role:row.role,profile:row.profile});if(!profile)return {resourceId:null,members:[],invitations:[],shared};const members=await tx.profileMembership.findMany({where:{profileId:profile.id,status:'ACTIVE'},select:{id:true,role:true,status:true,version:true,user:{select:{name:true}}},orderBy:{createdAt:'asc'}});const invitations=await tx.profileInvitation.findMany({where:{profileId:profile.id},take:50,orderBy:{createdAt:'desc'}});return {resourceId:profile.id,members,invitations:invitations.map(invitationDto),shared}},{isolationLevel:'RepeatableRead'})}
export async function createInvitation(db:PrismaClient,actor:ProfileActor,input:z.infer<typeof inviteInput>){const result=await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
 const profile=await own(tx,actor);if(input.resourceId!==profile.id)throw new ProfileError(404,'Página não encontrada.')
 const recipientHash=recipientDigest(input.email,env.JWT_SECRET),user=await active(tx,actor)
 if(!user.identifiers.some(row=>row.kind==='EMAIL'&&row.confirmedAt&&!row.replacedAt))throw new ProfileError(403,'Confirme seu e-mail antes de convidar.')
 if(user.identifiers.some(row=>row.kind==='EMAIL'&&recipientDigest(row.normalizedValue,env.JWT_SECRET)===recipientHash))throw new ProfileError(400,'Você já é proprietário desta página.')
 const existing=await tx.profileInvitation.findUnique({where:{profileId_requestKey:{profileId:profile.id,requestKey:input.requestKey}}})
 if(existing){if(existing.recipientHash!==recipientHash||existing.role!==input.role)throw new ProfileError(409,'Este pedido já foi usado com outros dados.');return {invitation:invitationDto(existing),token:null}}
 const token=invitationToken(),now=profileNow(),row=await tx.profileInvitation.create({data:{id:randomUUID(),profileId:profile.id,tenantId:actor.tenantId,ownerId:actor.ownerId,role:input.role,recipientHash,tokenHash:tokenDigest(token),requestKey:input.requestKey,expiresAt:new Date(now.getTime()+7*86400000),createdAt:now}})
 await audit(tx,actor,profile.id,'profile.team.invited',{invitationId:row.id,role:row.role});return {invitation:invitationDto(row),token}
 });return {...result,emailDelivery:result.token?await sendInvitationEmail(db,{tenantId:actor.tenantId,kind:'profile_invitation',email:input.email,token:result.token,requestId:input.requestKey}):null}}
export async function acceptInvitation(db:PrismaClient,actor:ProfileActor,token:string){return db.$transaction(async tx=>{
 const found=await tx.profileInvitation.findUnique({where:{tokenHash:tokenDigest(token)}});if(!found||found.tenantId!==actor.tenantId)throw new ProfileError(404,'Convite não encontrado.')
 await tx.$queryRaw`SELECT id FROM users WHERE id=${found.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
 const row=await tx.profileInvitation.findUnique({where:{id:found.id}}),user=await active(tx,actor),owner=await tx.user.findFirst({where:{id:found.ownerId,tenantId:actor.tenantId,status:'ACTIVE'}})
 if(!row||!owner||!invitationAvailable(row,profileNow()))throw new ProfileError(409,'Este convite expirou, já foi usado ou foi revogado.')
 if(actor.ownerId===row.ownerId||!user.identifiers.some(id=>id.kind==='EMAIL'&&id.confirmedAt&&recipientDigest(id.normalizedValue,env.JWT_SECRET)===row.recipientHash))throw new ProfileError(403,'Entre com o e-mail confirmado que recebeu este convite.')
 const member=await tx.profileMembership.upsert({where:{profileId_userId:{profileId:row.profileId,userId:actor.ownerId}},create:{profileId:row.profileId,tenantId:actor.tenantId,ownerId:row.ownerId,userId:actor.ownerId,role:row.role},update:{status:'ACTIVE',role:row.role,version:{increment:1}}})
 await tx.profileInvitation.update({where:{id:row.id},data:{usedAt:profileNow()}});await audit(tx,actor,row.profileId,'profile.team.accepted',{membershipId:member.id,invitationId:row.id,role:member.role});return {membership:{id:member.id,resourceId:member.profileId,role:member.role,status:member.status}}
 })}
export async function revokeAccess(db:PrismaClient,actor:ProfileActor,id:string,kind:'member'|'invitation',version?:number){return db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
 const profile=await own(tx,actor)
 if(kind==='member'){const row=await tx.profileMembership.findFirst({where:{id,profileId:profile.id}});if(!row)throw new ProfileError(404,'Colaborador não encontrado.');if(row.status==='REVOKED')return {revoked:true};if(row.version!==version)throw new ProfileError(409,'O acesso mudou. Recarregue antes de revogar.');await tx.profileMembership.update({where:{id},data:{status:'REVOKED',version:{increment:1}}})
  const receipts=await tx.auditLog.findMany({where:{tenantId:actor.tenantId,entityType:'Profile',entityId:profile.id,actorId:row.userId,action:'profile.team.accepted',after:{path:['membershipId'],equals:row.id}},select:{after:true}})
  const invitationIds=receipts.flatMap(receipt=>{const value=receipt.after;if(!value||typeof value!=='object'||Array.isArray(value))return [];return typeof value.invitationId==='string'?[value.invitationId]:[]})
  const previous=await tx.profileInvitation.findMany({where:{profileId:profile.id,id:{in:invitationIds}},select:{recipientHash:true}})
  const current=await tx.userIdentifier.findMany({where:{tenantId:actor.tenantId,userId:row.userId,kind:'EMAIL'},select:{normalizedValue:true}})
  const hashes=[...new Set([...previous.map(invite=>invite.recipientHash),...current.map(identifier=>recipientDigest(identifier.normalizedValue,env.JWT_SECRET))])]
  await tx.profileInvitation.updateMany({where:{profileId:profile.id,recipientHash:{in:hashes},usedAt:null,revokedAt:null},data:{revokedAt:profileNow()}})
 }
 else{const row=await tx.profileInvitation.findFirst({where:{id,profileId:profile.id}});if(!row)throw new ProfileError(404,'Convite não encontrado.');if(row.revokedAt)return {revoked:true};await tx.profileInvitation.update({where:{id},data:{revokedAt:profileNow()}})}
 await audit(tx,actor,profile.id,'profile.team.revoked',{resourceId:id,kind});return {revoked:true}
 })}
