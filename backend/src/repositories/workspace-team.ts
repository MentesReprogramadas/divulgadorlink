import {Prisma,type PrismaClient} from '@prisma/client'
import {isDeepStrictEqual} from 'node:util'
import {randomUUID} from 'node:crypto'
import {ProfileError} from '@/domain/profiles/profile'
import {invitationToken,tokenDigest,recipientDigest,invitationAvailable} from '@/domain/access/profile-access'
import {workspaceGrants,permissionSections,type WorkspaceGrants} from '@/domain/access/workspace-permissions'
import {env} from '@/env'
type Actor={tenantId:string;sub:string}
export type WorkspaceMember={id:string;tenantId:string;ownerId:string;userId:string;grants:WorkspaceGrants;version:number;revokedAt:Date|null}
type Invite={id:string;tenantId:string;ownerId:string;grants:WorkspaceGrants;recipientHash:string;tokenHash:string;requestKey:string;expiresAt:Date;usedAt:Date|null;revokedAt:Date|null}
async function active(tx:Prisma.TransactionClient,a:Actor){const user=await tx.user.findFirst({where:{id:a.sub,tenantId:a.tenantId,status:'ACTIVE'},include:{identifiers:{where:{replacedAt:null}}}});if(!user)throw new ProfileError(403,'Conta sem acesso.');return user}
async function lock(tx:Prisma.TransactionClient,a:Actor){await tx.$queryRaw`SELECT id FROM users WHERE id=${a.sub} AND "tenantId"=${a.tenantId} FOR UPDATE`;return active(tx,a)}
function validateGrants(grants:WorkspaceGrants,role:string){const result=workspaceGrants.parse(grants);if(role!=='ADMIN'&&Object.entries(result).some(([key,value])=>key.startsWith('admin')&&(value?.read||value?.write)))throw new ProfileError(403,'Somente administradores podem conceder acesso administrativo.');return result}
async function audit(tx:Prisma.TransactionClient,a:Actor,action:string,id:string,after:Prisma.InputJsonObject){await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.sub,entityType:'Workspace',entityId:id,action,after}})}
export async function workspaceMembership(db:PrismaClient,tenantId:string,ownerId:string,userId:string){const rows=await db.$queryRaw<WorkspaceMember[]>`SELECT * FROM workspace_memberships WHERE "tenantId"=${tenantId} AND "ownerId"=${ownerId} AND "userId"=${userId} AND "revokedAt" IS NULL`;return rows[0]??null}
export async function teamWorkspaces(db:PrismaClient,a:Actor){await db.$transaction(tx=>active(tx,a));return db.$queryRaw<Array<{ownerId:string;name:string;grants:WorkspaceGrants}>>`SELECT m."ownerId",u.name,m.grants FROM workspace_memberships m JOIN users u ON u.id=m."ownerId" AND u."tenantId"=m."tenantId" WHERE m."tenantId"=${a.tenantId} AND m."userId"=${a.sub} AND m."revokedAt" IS NULL AND u.status='ACTIVE' ORDER BY u.name`}
export async function readWorkspaceTeam(db:PrismaClient,a:Actor){return db.$transaction(async tx=>{const actor=await active(tx,a);const members=await tx.$queryRaw<Array<WorkspaceMember&{name:string}>>`SELECT m.*,u.name FROM workspace_memberships m JOIN users u ON u.id=m."userId" AND u."tenantId"=m."tenantId" WHERE m."tenantId"=${a.tenantId} AND m."ownerId"=${a.sub} AND m."revokedAt" IS NULL ORDER BY m."createdAt"`;const invitations=await tx.$queryRaw<Array<{id:string;expiresAt:Date;usedAt:Date|null;revokedAt:Date|null}>>`SELECT id,"expiresAt","usedAt","revokedAt" FROM workspace_invitations WHERE "tenantId"=${a.tenantId} AND "ownerId"=${a.sub} ORDER BY "createdAt" DESC LIMIT 50`;return {sections:permissionSections.filter(row=>actor.role==='ADMIN'||!row.id.startsWith('admin')),members,invitations:invitations.map(row=>({id:row.id,expiresAt:row.expiresAt,status:row.revokedAt?'REVOKED':row.usedAt?'ACCEPTED':row.expiresAt<=new Date()?'EXPIRED':'PENDING'}))}})}
export async function inviteWorkspace(db:PrismaClient,a:Actor,input:{email:string;grants:WorkspaceGrants;requestKey:string}){return db.$transaction(async tx=>{
 const user=await lock(tx,a);if(!user.identifiers.some(row=>row.kind==='EMAIL'&&row.confirmedAt))throw new ProfileError(403,'Confirme seu e-mail antes de convidar.');const grants=validateGrants(input.grants,user.role),recipientHash=recipientDigest(input.email,env.JWT_SECRET)
 if(user.identifiers.some(row=>row.kind==='EMAIL'&&recipientDigest(row.normalizedValue,env.JWT_SECRET)===recipientHash))throw new ProfileError(400,'Você já tem acesso completo ao seu espaço.')
 const previous=await tx.$queryRaw<Invite[]>`SELECT * FROM workspace_invitations WHERE "tenantId"=${a.tenantId} AND "ownerId"=${a.sub} AND "requestKey"=${input.requestKey}`
 if(previous.length){if(previous[0].recipientHash!==recipientHash||!isDeepStrictEqual(previous[0].grants,grants))throw new ProfileError(409,'Pedido já utilizado.');return {token:null}}
 const id=randomUUID(),token=invitationToken(),digest=tokenDigest(token),expiresAt=new Date(Date.now()+7*86400000)
 await tx.$executeRaw`INSERT INTO workspace_invitations(id,"tenantId","ownerId",grants,"recipientHash","tokenHash","requestKey","expiresAt") VALUES(${id},${a.tenantId},${a.sub},${JSON.stringify(grants)}::jsonb,${recipientHash},${digest},${input.requestKey},${expiresAt})`
 await audit(tx,a,'workspace.invited',id,{grants});return {token}
 })}
export async function acceptWorkspace(db:PrismaClient,a:Actor,token:string){return db.$transaction(async tx=>{
 const lookup=await tx.$queryRaw<Invite[]>`SELECT * FROM workspace_invitations WHERE "tokenHash"=${tokenDigest(token)} AND "tenantId"=${a.tenantId}`
 if(!lookup[0])throw new ProfileError(404,'Convite não encontrado.')
 const found=lookup[0],owner=await lock(tx,{...a,sub:found.ownerId})
 const rows=await tx.$queryRaw<Invite[]>`SELECT * FROM workspace_invitations WHERE id=${found.id} FOR UPDATE`,row=rows[0],user=await active(tx,a)
 if(!invitationAvailable(row,new Date()))throw new ProfileError(409,'Convite expirado, revogado ou já utilizado.')
 if(found.ownerId===a.sub||!user.identifiers.some(id=>id.kind==='EMAIL'&&id.confirmedAt&&recipientDigest(id.normalizedValue,env.JWT_SECRET)===row.recipientHash))throw new ProfileError(403,'Entre com o e-mail confirmado convidado.')
 const grants=validateGrants(row.grants,owner.role)
 await tx.$executeRaw`INSERT INTO workspace_memberships(id,"tenantId","ownerId","userId",grants) VALUES(${randomUUID()},${a.tenantId},${row.ownerId},${a.sub},${JSON.stringify(grants)}::jsonb) ON CONFLICT("tenantId","ownerId","userId") DO UPDATE SET grants=EXCLUDED.grants,"revokedAt"=NULL,version=workspace_memberships.version+1`
 await tx.$executeRaw`UPDATE workspace_invitations SET "usedAt"=CURRENT_TIMESTAMP WHERE id=${row.id}`
 await audit(tx,a,'workspace.accepted',row.ownerId,{invitationId:row.id});return {ownerId:row.ownerId}
 })}
export async function changeWorkspaceMember(db:PrismaClient,a:Actor,id:string,version:number,grants:WorkspaceGrants|null){return db.$transaction(async tx=>{
 const owner=await lock(tx,a);const rows=await tx.$queryRaw<WorkspaceMember[]>`SELECT * FROM workspace_memberships WHERE id=${id} AND "ownerId"=${a.sub} AND "tenantId"=${a.tenantId} FOR UPDATE`,row=rows[0]
 if(!row)throw new ProfileError(404,'Colaborador não encontrado.')
 if(row.version!==version)throw new ProfileError(409,'O acesso mudou. Atualize antes de salvar.')
 if(grants){const next=validateGrants(grants,owner.role);await tx.$executeRaw`UPDATE workspace_memberships SET grants=${JSON.stringify(next)}::jsonb,version=version+1 WHERE id=${id}`}
 else await tx.$executeRaw`UPDATE workspace_memberships SET "revokedAt"=CURRENT_TIMESTAMP,version=version+1 WHERE id=${id}`
 const emails=await tx.userIdentifier.findMany({where:{tenantId:a.tenantId,userId:row.userId,kind:'EMAIL'}}),hashes=emails.map(email=>recipientDigest(email.normalizedValue,env.JWT_SECRET))
 // Include hashes of accepted invites even if an address was changed later.
 const receipts=await tx.auditLog.findMany({where:{tenantId:a.tenantId,actorId:row.userId,entityType:'Workspace',entityId:a.sub,action:'workspace.accepted'},select:{after:true}})
 const ids=receipts.flatMap(receipt=>{const value=receipt.after;return value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.invitationId==='string'?[value.invitationId]:[]})
 if(ids.length){const old=await tx.$queryRaw<Array<{recipientHash:string}>>(Prisma.sql`SELECT "recipientHash" FROM workspace_invitations WHERE id IN (${Prisma.join(ids)}) AND "ownerId"=${a.sub} AND "tenantId"=${a.tenantId}`);hashes.push(...old.map(invite=>invite.recipientHash))}
 if(hashes.length)await tx.$executeRaw(Prisma.sql`UPDATE workspace_invitations SET "revokedAt"=CURRENT_TIMESTAMP WHERE "tenantId"=${a.tenantId} AND "ownerId"=${a.sub} AND "recipientHash" IN (${Prisma.join(hashes)}) AND "usedAt" IS NULL`)
 await audit(tx,a,grants?'workspace.permissions.updated':'workspace.revoked',id,grants?{grants}:{revoked:true});return {saved:true}
 })}
export async function revokeWorkspaceInvite(db:PrismaClient,a:Actor,id:string){return db.$transaction(async tx=>{await lock(tx,a);const count=await tx.$executeRaw`UPDATE workspace_invitations SET "revokedAt"=CURRENT_TIMESTAMP WHERE id=${id} AND "tenantId"=${a.tenantId} AND "ownerId"=${a.sub} AND "usedAt" IS NULL`;if(!count)throw new ProfileError(404,'Convite não encontrado.');await audit(tx,a,'workspace.invitation.revoked',id,{});return {revoked:true}})}
