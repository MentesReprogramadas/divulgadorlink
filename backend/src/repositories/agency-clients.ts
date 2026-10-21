import {canWorkspace,workspaceGrants} from '@/domain/access/workspace-permissions'
import {randomUUID} from 'node:crypto'
import {Prisma,type PrismaClient} from '@prisma/client'
import {ProfileError} from '@/domain/profiles/profile'
import {agencyClientCapacity,agencyClientInput,agencyAccessInput} from '@/domain/access/agency'
import type {ProfileActor} from '@/domain/access/profile-access'
import {profileNow} from '@/lib/profile-clock'
import {agencyDerivedAccess} from './agency-access-guard'
import type {z} from 'zod'
type Client={id:string;workspaceId:string;tenantId:string;agencyOwnerId:string;profileId:string;clientOwnerId:string;name:string;version:number;archivedAt:Date|null}
async function lockUsers(tx:Prisma.TransactionClient,tenantId:string,ids:string[]){await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE "tenantId"=${tenantId} AND id IN (${Prisma.join([...new Set(ids)])}) ORDER BY id FOR UPDATE`)}
type Access={id:string;clientId:string;tenantId:string;agencyOwnerId:string;profileId:string;clientOwnerId:string;userId:string;role:'EDITOR'|'VIEWER';status:string;version:number;expiresAt:Date;membershipId:string|null;membershipVersion:number|null;requestKey:string}
async function active(tx:Prisma.TransactionClient,a:ProfileActor,write=false){if(a.auditActorId&&a.auditActorId!==a.ownerId){const membership=await tx.workspaceMembership.findFirst({where:{tenantId:a.tenantId,ownerId:a.ownerId,userId:a.auditActorId,revokedAt:null}});if(!membership||!canWorkspace(workspaceGrants.parse(membership.grants),'agency',write))throw new ProfileError(403,'Seu acesso à agência mudou.')}const user=await tx.user.findFirst({where:{id:a.auditActorId??a.ownerId,tenantId:a.tenantId,status:'ACTIVE'},include:{identifiers:true}});if(!user||write&&!user.identifiers.some(row=>row.kind==='EMAIL'&&row.confirmedAt&&!row.replacedAt))throw new ProfileError(403,'Confirme seu e-mail e verifique o estado da conta.');return user}
async function scope(tx:Prisma.TransactionClient,a:ProfileActor,profileId:string,write=false){
 const userId=a.auditActorId??a.ownerId;if(!await tx.user.findFirst({where:{id:userId,tenantId:a.tenantId,status:'ACTIVE'},select:{id:true}}))throw new ProfileError(403,'Conta sem acesso.');const p=await tx.profile.findFirst({where:{id:profileId,tenantId:a.tenantId,owner:{status:'ACTIVE'}}})
 if(!p)throw new ProfileError(404,'Página indisponível.')
 if(p.ownerId===userId)return{profile:p,role:'OWNER',membership:null}
 const member=await tx.profileMembership.findUnique({where:{profileId_userId:{profileId,userId}}});if(!member||member.status!=='ACTIVE'||write&&member.role!=='EDITOR'||!await agencyDerivedAccess(tx,member.id,member.version))throw new ProfileError(403,'Peça acesso à equipe da página primeiro.')
 return{profile:p,role:member.role,membership:member}
}
async function audit(tx:Prisma.TransactionClient,a:ProfileActor,id:string,action:string,after:Prisma.InputJsonObject={}){await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.ownerId,action:'agency.'+action,entityType:'AgencyClient',entityId:id,after}})}
export async function listAgencyClients(db:PrismaClient,a:ProfileActor){return db.$transaction(async tx=>{
 await active(tx,a);const workspace=(await tx.$queryRaw<Array<{id:string;maxClients:number}>>`SELECT id,"maxClients" FROM agency_workspaces WHERE "tenantId"=${a.tenantId} AND "agencyOwnerId"=${a.ownerId}`)[0]
 const rows=workspace?await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE "workspaceId"=${workspace.id}::uuid AND "archivedAt" IS NULL ORDER BY "createdAt" DESC`:[]
 const clients=[];for(const row of rows){try{const access=await scope(tx,a,row.profileId);clients.push({id:row.id,name:row.name,version:row.version,available:true,profile:{id:access.profile.id,name:access.profile.name,slug:access.profile.slug,published:access.profile.publishedVersion!==null},role:access.role})}catch(reason){if(!(reason instanceof ProfileError))throw reason;clients.push({id:row.id,version:row.version,available:false,name:null,profile:null,role:null})}}
 const actor=a.auditActorId??a.ownerId,shared=await tx.profileMembership.findMany({where:{tenantId:a.tenantId,userId:actor,status:'ACTIVE',profile:{owner:{status:'ACTIVE'}}},include:{profile:true}}),owned=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:actor}}}),choices=[]
 for(const row of shared)if(await agencyDerivedAccess(tx,row.id,row.version))choices.push({id:row.profile.id,name:row.profile.name,slug:row.profile.slug})
 if(owned)choices.unshift({id:owned.id,name:owned.name,slug:owned.slug})
 return{clients,choices:choices.filter(row=>!rows.some(client=>client.profileId===row.id)),limit:workspace?.maxClients??10,used:rows.length,personal:!a.auditActorId||a.auditActorId===a.ownerId}
})}
export async function addAgencyClient(db:PrismaClient,a:ProfileActor,input:z.infer<typeof agencyClientInput>){return db.$transaction(async tx=>{
 const initial=await tx.profile.findFirst({where:{id:input.profileId,tenantId:a.tenantId},select:{ownerId:true}});if(!initial)throw new ProfileError(404,'Página indisponível.');await lockUsers(tx,a.tenantId,[a.ownerId,a.auditActorId??a.ownerId,initial.ownerId]);await active(tx,a,true);await tx.$queryRaw`SELECT id FROM profiles WHERE id=${input.profileId} AND "tenantId"=${a.tenantId} FOR SHARE`
 const access=await scope(tx,a,input.profileId)
 // A collaborator cannot add a page that the agency itself has never been authorized to manage.
 await scope(tx,{...a,auditActorId:undefined},input.profileId)
 const workspace=(await tx.$queryRaw<Array<{id:string;maxClients:number}>>`INSERT INTO agency_workspaces(id,"tenantId","agencyOwnerId") VALUES(${randomUUID()}::uuid,${a.tenantId},${a.ownerId}) ON CONFLICT("tenantId","agencyOwnerId") DO UPDATE SET "agencyOwnerId"=EXCLUDED."agencyOwnerId" RETURNING id,"maxClients"`)[0]!
 const existing=(await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE "workspaceId"=${workspace.id}::uuid AND "profileId"=${input.profileId}`)[0]
 if(existing&&!existing.archivedAt)return{id:existing.id}
 const count=(await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) AS count FROM agency_clients WHERE "workspaceId"=${workspace.id}::uuid AND "archivedAt" IS NULL`)[0]!.count
 if(!agencyClientCapacity(Number(count),workspace.maxClients))throw new ProfileError(422,'O portfólio atingiu o limite de clientes ativos. Nenhuma página foi removida.')
 const id=existing?.id??randomUUID();if(existing)await tx.$executeRaw`UPDATE agency_clients SET name=${input.name},"clientOwnerId"=${access.profile.ownerId},"archivedAt"=NULL,version=version+1 WHERE id=${id}::uuid`
 else await tx.$executeRaw`INSERT INTO agency_clients(id,"workspaceId","tenantId","agencyOwnerId","profileId","clientOwnerId",name) VALUES(${id}::uuid,${workspace.id}::uuid,${a.tenantId},${a.ownerId},${input.profileId},${access.profile.ownerId},${input.name})`
 await audit(tx,a,id,'client.added',{profileId:input.profileId});return{id}
})}
async function revokeDerived(tx:Prisma.TransactionClient,rows:Access[],now:Date){for(const row of rows){if(row.membershipId&&row.membershipVersion!==null)await tx.profileMembership.updateMany({where:{id:row.membershipId,tenantId:row.tenantId,version:row.membershipVersion,status:'ACTIVE'},data:{status:'REVOKED',version:{increment:1}}});await tx.$executeRaw`UPDATE agency_access_requests SET status='REVOKED',version=version+1,"updatedAt"=${now} WHERE id=${row.id}::uuid`}}
export async function archiveAgencyClient(db:PrismaClient,a:ProfileActor,id:string,version:number){return db.$transaction(async tx=>{
 const initial=(await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE id=${id}::uuid AND "tenantId"=${a.tenantId} AND "agencyOwnerId"=${a.ownerId}`)[0];if(!initial)throw new ProfileError(404,'Cliente não encontrado.');await lockUsers(tx,a.tenantId,[a.ownerId,a.auditActorId??a.ownerId,initial.clientOwnerId]);await active(tx,a,true);await tx.$queryRaw`SELECT id FROM profiles WHERE id=${initial.profileId} FOR SHARE`;const row=(await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE id=${id}::uuid AND "tenantId"=${a.tenantId} AND "agencyOwnerId"=${a.ownerId} FOR UPDATE`)[0]
 if(!row)throw new ProfileError(404,'Cliente não encontrado.');if(row.archivedAt)return{ok:true};if(row.version!==version)throw new ProfileError(409,'O cliente mudou. Atualize os dados.')
 const now=profileNow(),grants=await tx.$queryRaw<Access[]>`SELECT * FROM agency_access_requests WHERE "clientId"=${id}::uuid AND status='APPROVED'`;await revokeDerived(tx,grants,now)
 await tx.$executeRaw`UPDATE agency_access_requests SET status='REVOKED',version=version+1,"updatedAt"=${now} WHERE "clientId"=${id}::uuid AND status='PENDING'`
 await tx.$executeRaw`UPDATE agency_clients SET "archivedAt"=${now},version=version+1 WHERE id=${id}::uuid`;await audit(tx,a,id,'client.archived');return{ok:true}
})}
export async function listAgencyAccess(db:PrismaClient,a:ProfileActor){return db.$transaction(async tx=>{
 await active(tx,a);const now=profileNow();await tx.$executeRaw`UPDATE agency_access_requests SET status='EXPIRED',version=version+1,"updatedAt"=${now} WHERE "tenantId"=${a.tenantId} AND ("agencyOwnerId"=${a.ownerId} OR "clientOwnerId"=${a.ownerId}) AND status='PENDING' AND "expiresAt"<=${now}`
 const rows=await tx.$queryRaw<Access[]>`SELECT * FROM agency_access_requests WHERE "tenantId"=${a.tenantId} AND ("agencyOwnerId"=${a.ownerId} OR "clientOwnerId"=${a.ownerId}) ORDER BY "createdAt" DESC LIMIT 50`,requests=[]
 for(const row of rows){if(row.status==='APPROVED'){const member=row.membershipId?await tx.profileMembership.findUnique({where:{id:row.membershipId}}):null;if(!member||member.status!=='ACTIVE'||member.version!==row.membershipVersion||!await agencyDerivedAccess(tx,member.id,member.version)){await revokeDerived(tx,[row],now);row.status='REVOKED';row.version++}}let page:null|{name:string;slug:string}=null;if(row.clientOwnerId===(a.auditActorId??a.ownerId))page=await tx.profile.findFirst({where:{id:row.profileId,tenantId:a.tenantId,ownerId:a.ownerId},select:{name:true,slug:true}});else try{const value=await scope(tx,a,row.profileId);page={name:value.profile.name,slug:value.profile.slug}}catch(reason){if(!(reason instanceof ProfileError))throw reason}
  const user=page?await tx.user.findFirst({where:{id:row.userId,tenantId:a.tenantId},select:{name:true}}):null;requests.push({id:row.id,version:row.version,role:row.role,status:row.status,page,userName:user?.name??null,incoming:row.clientOwnerId===(a.auditActorId??a.ownerId),expiresAt:row.expiresAt})}
 const colleagues=await tx.workspaceMembership.findMany({where:{tenantId:a.tenantId,ownerId:a.ownerId,revokedAt:null,user:{status:'ACTIVE'}},select:{userId:true,user:{select:{name:true}}}})
 const personal=!a.auditActorId||a.auditActorId===a.ownerId,clients=[];if(personal){const candidates=await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE "tenantId"=${a.tenantId} AND "agencyOwnerId"=${a.ownerId} AND "archivedAt" IS NULL`;for(const client of candidates)try{const access=await scope(tx,a,client.profileId,true);clients.push({id:client.id,name:client.name,pageName:access.profile.name})}catch(reason){if(!(reason instanceof ProfileError))throw reason}}
 return{requests,clients,colleagues:personal?colleagues.map(row=>({id:row.userId,name:row.user.name??'Colaborador'})):[],personal:!a.auditActorId||a.auditActorId===a.ownerId}
})}
export async function requestAgencyAccess(db:PrismaClient,a:ProfileActor,input:z.infer<typeof agencyAccessInput>){return db.$transaction(async tx=>{
 if(a.auditActorId&&a.auditActorId!==a.ownerId)throw new ProfileError(403,'O responsável pela agência deve solicitar o acesso.')
 const initial=(await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE id=${input.clientId}::uuid AND "tenantId"=${a.tenantId} AND "agencyOwnerId"=${a.ownerId}`)[0];if(!initial)throw new ProfileError(404,'Cliente não encontrado.');await lockUsers(tx,a.tenantId,[a.ownerId,input.userId,initial.clientOwnerId]);await active(tx,a,true);await tx.$queryRaw`SELECT id FROM profiles WHERE id=${initial.profileId} FOR SHARE`
 const client=(await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE id=${input.clientId}::uuid AND "tenantId"=${a.tenantId} AND "agencyOwnerId"=${a.ownerId} AND "archivedAt" IS NULL FOR UPDATE`)[0];if(!client)throw new ProfileError(404,'Cliente não encontrado.')
 await scope(tx,a,client.profileId,true);const colleague=await tx.workspaceMembership.findFirst({where:{tenantId:a.tenantId,ownerId:a.ownerId,userId:input.userId,revokedAt:null,user:{status:'ACTIVE'}}});if(!colleague||input.userId===client.clientOwnerId)throw new ProfileError(422,'Escolha uma pessoa ativa da sua equipe.')
 const existing=(await tx.$queryRaw<Access[]>`SELECT * FROM agency_access_requests WHERE "agencyOwnerId"=${a.ownerId} AND "requestKey"=${input.requestKey}::uuid`)[0];if(existing){if(existing.clientId!==client.id||existing.userId!==input.userId||existing.role!==input.role)throw new ProfileError(409,'Identificador de pedido já utilizado.');return{id:existing.id}}
 const now=profileNow();await tx.$executeRaw`UPDATE agency_access_requests SET status='EXPIRED',version=version+1,"updatedAt"=${now} WHERE "clientId"=${client.id}::uuid AND status='PENDING' AND "expiresAt"<=${now}`
 if((await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) AS count FROM agency_access_requests WHERE "clientId"=${client.id}::uuid AND status='PENDING'`)[0]!.count>=10n)throw new ProfileError(429,'Aguarde a decisão dos pedidos abertos para este cliente.')
 if((await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agency_access_requests WHERE "clientId"=${client.id}::uuid AND "userId"=${input.userId} AND status='PENDING'`).length)throw new ProfileError(409,'Já existe um pedido aberto para esta pessoa.')
 const id=randomUUID();await tx.$executeRaw`INSERT INTO agency_access_requests(id,"clientId","tenantId","agencyOwnerId","profileId","clientOwnerId","userId",role,"requestKey","expiresAt") VALUES(${id}::uuid,${client.id}::uuid,${a.tenantId},${a.ownerId},${client.profileId},${client.clientOwnerId},${input.userId},${input.role},${input.requestKey}::uuid,${new Date(+now+7*86400000)})`;await audit(tx,a,client.id,'access.requested',{requestId:id});return{id}
})}
export async function decideAgencyAccess(db:PrismaClient,a:ProfileActor,id:string,version:number,approve:boolean){return db.$transaction(async tx=>{
 const initial=(await tx.$queryRaw<Access[]>`SELECT * FROM agency_access_requests WHERE id=${id}::uuid AND "tenantId"=${a.tenantId} AND "clientOwnerId"=${a.ownerId}`)[0];if(!initial)throw new ProfileError(404,'Pedido não encontrado.');await lockUsers(tx,a.tenantId,[a.ownerId,initial.userId,initial.agencyOwnerId]);await tx.$queryRaw`SELECT id FROM profiles WHERE id=${initial.profileId} FOR SHARE`
 const user=await active(tx,a,true);if(a.auditActorId&&a.auditActorId!==a.ownerId||!user.identifiers.some(row=>row.kind==='EMAIL'&&row.confirmedAt))throw new ProfileError(403,'O titular com e-mail confirmado deve decidir.')
 const row=(await tx.$queryRaw<Access[]>`SELECT * FROM agency_access_requests WHERE id=${id}::uuid AND "tenantId"=${a.tenantId} AND "clientOwnerId"=${a.ownerId} FOR UPDATE`)[0];if(!row)throw new ProfileError(404,'Pedido não encontrado.');if(row.status==='DECLINED'&&!approve)return{ok:true};if(row.status==='APPROVED'&&approve){const member=row.membershipId?await tx.profileMembership.findUnique({where:{id:row.membershipId}}):null;if(member?.status==='ACTIVE'&&member.version===row.membershipVersion&&await agencyDerivedAccess(tx,member.id,member.version))return{ok:true}}if(row.version!==version||row.status!=='PENDING'||row.expiresAt<=profileNow())throw new ProfileError(409,'O pedido mudou ou expirou.')
 if(approve){const agency={tenantId:a.tenantId,ownerId:row.agencyOwnerId,age:a.age};const parent=await scope(tx,agency,row.profileId,true),member=await tx.workspaceMembership.findFirst({where:{tenantId:a.tenantId,ownerId:row.agencyOwnerId,userId:row.userId,revokedAt:null,user:{status:'ACTIVE'}}}),client=(await tx.$queryRaw<Client[]>`SELECT * FROM agency_clients WHERE id=${row.clientId}::uuid AND "archivedAt" IS NULL`)[0];if(!member||!client||parent.profile.ownerId!==a.ownerId)throw new ProfileError(409,'O vínculo com a agência mudou. Peça uma nova solicitação.')
  const previous=await tx.profileMembership.findUnique({where:{profileId_userId:{profileId:row.profileId,userId:row.userId}}});if(previous?.status==='ACTIVE'&&!(await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agency_access_requests WHERE "membershipId"=${previous.id} AND "membershipVersion"=${previous.version} AND "agencyOwnerId"=${row.agencyOwnerId} AND "clientId"=${row.clientId}::uuid AND status='APPROVED'`).length)throw new ProfileError(409,'Essa pessoa já tem acesso direto. Ajuste pela equipe da página.')
  const current=await tx.profileMembership.upsert({where:{profileId_userId:{profileId:row.profileId,userId:row.userId}},create:{tenantId:a.tenantId,ownerId:a.ownerId,profileId:row.profileId,userId:row.userId,role:row.role},update:{role:row.role,status:'ACTIVE',version:{increment:1}}})
  await tx.$executeRaw`UPDATE agency_access_requests SET status='APPROVED',version=version+1,"membershipId"=${current.id},"membershipVersion"=${current.version},"workspaceMembershipId"=${member.id},"workspaceMembershipVersion"=${member.version},"parentMembershipId"=${parent.membership?.id??null},"parentMembershipVersion"=${parent.membership?.version??null},"updatedAt"=${profileNow()} WHERE id=${id}::uuid`
 }else await tx.$executeRaw`UPDATE agency_access_requests SET status='DECLINED',version=version+1,"updatedAt"=${profileNow()} WHERE id=${id}::uuid`
 await audit(tx,a,row.clientId,approve?'access.approved':'access.declined',{requestId:id});return{ok:true}
})}
export async function purgeAgencyAccess(db:PrismaClient,now=new Date()){return db.$transaction(async tx=>{
 await tx.$executeRaw`UPDATE agency_access_requests SET status='EXPIRED',version=version+1,"updatedAt"=${now} WHERE status='PENDING' AND "expiresAt"<=${now}`
 await tx.$executeRaw`UPDATE agency_profile_transfers SET status='EXPIRED',version=version+1,"updatedAt"=${now} WHERE status='PENDING' AND "expiresAt"<=${now}`
 const rows=await tx.$queryRaw<Access[]>`SELECT r.* FROM agency_access_requests r
 LEFT JOIN profile_memberships m ON m.id=r."membershipId"
 LEFT JOIN workspace_memberships w ON w.id=r."workspaceMembershipId"
 LEFT JOIN profile_memberships parent ON parent.id=r."parentMembershipId"
 JOIN agency_clients c ON c.id=r."clientId" JOIN profiles p ON p.id=c."profileId"
 JOIN users agency ON agency.id=r."agencyOwnerId" AND agency."tenantId"=r."tenantId"
 WHERE r.status='APPROVED' AND (m.id IS NULL OR m.status<>'ACTIVE' OR m.version IS DISTINCT FROM r."membershipVersion"
 OR w.id IS NULL OR w."revokedAt" IS NOT NULL OR w.version IS DISTINCT FROM r."workspaceMembershipVersion"
 OR c."archivedAt" IS NOT NULL OR agency.status<>'ACTIVE'
 OR p."ownerId"<>r."agencyOwnerId" AND (parent.id IS NULL OR parent.status<>'ACTIVE' OR parent.role<>'EDITOR' OR parent.version IS DISTINCT FROM r."parentMembershipVersion"))
 ORDER BY r."updatedAt",r.id LIMIT 100 FOR UPDATE OF r SKIP LOCKED`
 await revokeDerived(tx,rows,now)
 await tx.$executeRaw`DELETE FROM agency_access_requests WHERE status<>'APPROVED' AND "updatedAt"<${new Date(+now-180*86400000)}`
 await tx.$executeRaw`DELETE FROM agency_profile_transfers WHERE status<>'PENDING' AND "updatedAt"<${new Date(+now-180*86400000)}`
})}
