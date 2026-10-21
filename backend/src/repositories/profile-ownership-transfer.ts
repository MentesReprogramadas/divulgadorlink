import {randomUUID} from 'node:crypto'
import {Prisma,type PrismaClient} from '@prisma/client'
import type {z} from 'zod'
import {ProfileError} from '@/domain/profiles/profile'
import {profileInput} from '@/domain/profiles/profile-input'
import {agencyTransferInput,agencyTransferReady} from '@/domain/access/agency'
import {recipientDigest,type ProfileActor} from '@/domain/access/profile-access'
import {env} from '@/env'
import {profileNow} from '@/lib/profile-clock'
type Transfer={id:string;tenantId:string;profileId:string;sourceOwnerId:string;targetOwnerId:string|null;recipientHash:string;profileVersion:number;requestKey:string;version:number;status:string;expiresAt:Date;pageName:string;pageSlug:string}
async function personal(tx:Prisma.TransactionClient,a:ProfileActor){if(a.auditActorId&&a.auditActorId!==a.ownerId)throw new ProfileError(403,'Volte à sua conta para transferir uma página.');const user=await tx.user.findFirst({where:{id:a.ownerId,tenantId:a.tenantId,status:'ACTIVE'},include:{identifiers:true}});if(!user)throw new ProfileError(403,'Conta sem acesso.');return{user,hashes:user.identifiers.filter(row=>row.kind==='EMAIL'&&row.confirmedAt&&!row.replacedAt).map(row=>recipientDigest(row.normalizedValue,env.JWT_SECRET))}}
const dto=(row:Transfer,userId:string)=>({id:row.id,profileId:row.profileId,pageName:row.pageName,pageSlug:row.pageSlug,version:row.version,profileVersion:row.profileVersion,status:row.status,expiresAt:row.expiresAt,incoming:row.sourceOwnerId!==userId})
export async function readProfileTransfers(db:PrismaClient,a:ProfileActor){return db.$transaction(async tx=>{
 const {hashes}=await personal(tx,a),now=profileNow();await tx.$executeRaw`UPDATE agency_profile_transfers SET status='EXPIRED',version=version+1,"updatedAt"=${now} WHERE "tenantId"=${a.tenantId} AND status='PENDING' AND "expiresAt"<=${now}`
 const rows=await tx.$queryRaw<Transfer[]>(Prisma.sql`SELECT * FROM agency_profile_transfers WHERE "tenantId"=${a.tenantId} AND ("sourceOwnerId"=${a.ownerId} OR "targetOwnerId"=${a.ownerId} ${hashes.length?Prisma.sql`OR "recipientHash" IN (${Prisma.join(hashes)})`:Prisma.empty}) ORDER BY "createdAt" DESC LIMIT 50`)
 const page=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}},select:{id:true,name:true,slug:true,version:true}})
 return{requests:rows.map(row=>dto(row,a.ownerId)),page,confirmed:hashes.length>0}
})}
export async function requestProfileTransfer(db:PrismaClient,a:ProfileActor,input:z.infer<typeof agencyTransferInput>){return db.$transaction(async tx=>{
 await personal(tx,a);await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`
 const {hashes}=await personal(tx,a);if(!hashes.length)throw new ProfileError(403,'Confirme seu e-mail antes de transferir.')
 await tx.$queryRaw`SELECT id FROM profiles WHERE id=${input.profileId} AND "tenantId"=${a.tenantId} FOR UPDATE`
 const page=await tx.profile.findFirst({where:{id:input.profileId,tenantId:a.tenantId,ownerId:a.ownerId}});if(!page)throw new ProfileError(404,'Página não encontrada.');if(page.version!==input.expectedVersion)throw new ProfileError(409,'A página mudou. Atualize os dados antes de transferir.')
 const recipientHash=recipientDigest(input.recipientEmail,env.JWT_SECRET);if(hashes.includes(recipientHash))throw new ProfileError(422,'Escolha o e-mail do novo titular.')
 const existing=(await tx.$queryRaw<Transfer[]>`SELECT * FROM agency_profile_transfers WHERE "sourceOwnerId"=${a.ownerId} AND "requestKey"=${input.requestKey}::uuid`)[0];if(existing){if(existing.profileId!==page.id||existing.recipientHash!==recipientHash||existing.profileVersion!==input.expectedVersion)throw new ProfileError(409,'Identificador de pedido já utilizado.');return dto(existing,a.ownerId)}
 const now=profileNow();await tx.$executeRaw`UPDATE agency_profile_transfers SET status='EXPIRED',version=version+1,"updatedAt"=${now} WHERE "profileId"=${page.id} AND status='PENDING' AND "expiresAt"<=${now}`
 if((await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agency_profile_transfers WHERE "profileId"=${page.id} AND status='PENDING'`).length)throw new ProfileError(409,'Já existe uma transferência pendente. Cancele ou aguarde a decisão.')
 const rows=await tx.$queryRaw<Transfer[]>`INSERT INTO agency_profile_transfers(id,"tenantId","profileId","sourceOwnerId","recipientHash","profileVersion","requestKey","expiresAt","pageName","pageSlug") VALUES(${randomUUID()}::uuid,${a.tenantId},${page.id},${a.ownerId},${recipientHash},${page.version},${input.requestKey}::uuid,${new Date(+now+7*86400000)},${page.name},${page.slug}) RETURNING *`
 await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.ownerId,action:'profile.transfer.requested',entityType:'Profile',entityId:page.id,after:{transferId:rows[0]!.id,version:page.version}}});return dto(rows[0]!,a.ownerId)
})}
type Ownership={relation:string;column:string;hasProfileId:boolean;ready:boolean}
/** Follow owner-bearing FK columns, so later page features cannot silently leave data behind. */
async function transferOwnershipRows(tx:Prisma.TransactionClient,profileId:string,tenantId:string,source:string,target:string){
 const rows=await tx.$queryRaw<Ownership[]>`
 WITH RECURSIVE ownership(relid,attnum) AS (
  SELECT 'profiles'::regclass::oid,attnum FROM pg_attribute WHERE attrelid='profiles'::regclass AND attname='ownerId'
  UNION
  SELECT c.conrelid,c.conkey[k.n] FROM ownership o JOIN pg_constraint c ON c.confrelid=o.relid AND c.contype='f'
  JOIN LATERAL generate_subscripts(c.confkey,1) k(n) ON c.confkey[k.n]=o.attnum
 ) SELECT DISTINCT cl.relname AS relation,a.attname AS column,
 EXISTS(SELECT 1 FROM pg_attribute p WHERE p.attrelid=o.relid AND p.attname='profileId' AND NOT p.attisdropped) AS "hasProfileId",
 NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN LATERAL generate_subscripts(c.conkey,1) k(n) ON c.conkey[k.n]=o.attnum WHERE c.conrelid=o.relid AND c.contype='f' AND c.confrelid IN(SELECT relid FROM ownership) AND NOT c.condeferrable) AS ready
 FROM ownership o JOIN pg_class cl ON cl.oid=o.relid JOIN pg_namespace n ON n.oid=cl.relnamespace JOIN pg_attribute a ON a.attrelid=o.relid AND a.attnum=o.attnum WHERE n.nspname='public' AND cl.relname<>'profiles'`
 if(rows.some(row=>!row.hasProfileId||!row.ready||!/^[a-z_]+$/.test(row.relation)||!['ownerId','clientOwnerId','profileOwnerId'].includes(row.column)))throw new ProfileError(503,'Uma estrutura nova precisa ser preparada antes da transferência. Nenhum dado foi alterado.')
 await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`
 await tx.$queryRaw`SELECT set_config('temlink.profile_transfer',${profileId},true)`
 await tx.profile.update({where:{id:profileId},data:{ownerId:target,version:{increment:1}}})
 for(const row of rows)await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw('"'+row.relation+'"')} SET ${Prisma.raw('"'+row.column+'"')}=${target} WHERE "profileId"=${profileId} AND "tenantId"=${tenantId} AND ${Prisma.raw('"'+row.column+'"')}=${source}`)
}
export async function decideProfileTransfer(db:PrismaClient,a:ProfileActor,id:string,version:number,action:'accept'|'decline'|'cancel'){
 return db.$transaction(async tx=>{
  const {hashes}=await personal(tx,a),initial=(await tx.$queryRaw<Transfer[]>`SELECT * FROM agency_profile_transfers WHERE id=${id}::uuid AND "tenantId"=${a.tenantId}`)[0]
  if(!initial||action==='cancel'&&initial.sourceOwnerId!==a.ownerId||action!=='cancel'&&initial.targetOwnerId!==a.ownerId&&!hashes.includes(initial.recipientHash))throw new ProfileError(404,'Transferência não encontrada.')
  await tx.$queryRaw`SELECT id FROM users WHERE "tenantId"=${a.tenantId} AND id IN (${initial.sourceOwnerId},${a.ownerId}) ORDER BY id FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM profiles WHERE id=${initial.profileId} AND "tenantId"=${a.tenantId} FOR UPDATE`
  const currentActor=await personal(tx,a);if(action!=='cancel'&&initial.targetOwnerId!==a.ownerId&&!currentActor.hashes.includes(initial.recipientHash))throw new ProfileError(404,'Transferência não encontrada.')
  const row=(await tx.$queryRaw<Transfer[]>`SELECT * FROM agency_profile_transfers WHERE id=${id}::uuid AND "tenantId"=${a.tenantId} FOR UPDATE`)[0]!
  if(row.status==='ACCEPTED'&&row.targetOwnerId===a.ownerId&&action==='accept')return dto(row,a.ownerId)
  const now=profileNow();if(row.version!==version||row.status!=='PENDING'||row.expiresAt<=now)throw new ProfileError(409,'O pedido mudou ou expirou. Atualize os dados.')
  if(action!=='accept'){await tx.$executeRaw`UPDATE agency_profile_transfers SET status=${action==='cancel'?'CANCELLED':'DECLINED'},version=version+1,"updatedAt"=${now} WHERE id=${id}::uuid`;await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.ownerId,action:'profile.transfer.'+action,entityType:'Profile',entityId:row.profileId,after:{transferId:id}}});return{ok:true}}
  if(!hashes.length||row.sourceOwnerId===a.ownerId)throw new ProfileError(403,'O novo titular precisa de conta própria e e-mail confirmado.')
  const source=await personal(tx,{tenantId:a.tenantId,ownerId:row.sourceOwnerId,age:a.age});if(!source.hashes.length)throw new ProfileError(409,'O titular atual precisa confirmar novamente o e-mail.')
  const page=await tx.profile.findFirst({where:{id:row.profileId,tenantId:a.tenantId,ownerId:row.sourceOwnerId,owner:{status:'ACTIVE'}}}),targetPage=await tx.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}}})
  if(!page||!agencyTransferReady(row,now,page.version,Boolean(targetPage)))throw new ProfileError(409,'A página foi alterada ou sua conta já tem uma página. Peça uma nova transferência após ajustar.')
  const assets=new Set<string>();if(page.avatarAssetId)assets.add(page.avatarAssetId);for(const raw of [page.publication,page.publishedDraft]){const parsed=profileInput.safeParse(raw);if(parsed.success&&parsed.data.avatarAssetId)assets.add(parsed.data.avatarAssetId)}
  const photos=await tx.profileAsset.findMany({where:{tenantId:a.tenantId,ownerId:row.sourceOwnerId,id:{in:[...assets]}}});if(photos.length)await tx.profileAsset.createMany({data:photos.map(photo=>({...photo,ownerId:a.ownerId})),skipDuplicates:true})
  await tx.profileMembership.deleteMany({where:{profileId:page.id,tenantId:a.tenantId,userId:a.ownerId}})
  await tx.profileMembership.updateMany({where:{profileId:page.id,tenantId:a.tenantId,status:'ACTIVE'},data:{status:'REVOKED',version:{increment:1}}})
  await tx.profileInvitation.updateMany({where:{profileId:page.id,tenantId:a.tenantId,revokedAt:null},data:{revokedAt:now}})
  await tx.contentReview.updateMany({where:{profileId:page.id,tenantId:a.tenantId,status:{in:['PENDING','REJECTED']}},data:{status:'SUPERSEDED',resolvedAt:now}})
  await tx.$executeRaw`UPDATE profile_button_tests SET status='STOPPED',version=version+1,"stoppedAt"=${now} WHERE "profileId"=${page.id} AND status='RUNNING'`
  await tx.profileMeasurement.updateMany({where:{profileId:page.id,tenantId:a.tenantId},data:{enabled:false,version:{increment:1}}})
  await tx.$executeRaw`UPDATE profile_discovery SET enabled=false,version=version+1 WHERE "profileId"=${page.id}`
  await tx.$executeRaw`UPDATE agency_access_requests SET status='REVOKED',version=version+1,"updatedAt"=${now} WHERE "profileId"=${page.id} AND status IN ('PENDING','APPROVED')`
  await transferOwnershipRows(tx,page.id,a.tenantId,row.sourceOwnerId,a.ownerId)
  await tx.$executeRaw`UPDATE agency_profile_transfers SET status='ACCEPTED',"targetOwnerId"=${a.ownerId},version=version+1,"updatedAt"=${now} WHERE id=${id}::uuid`
  await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.ownerId,action:'profile.transfer.accepted',entityType:'Profile',entityId:page.id,before:{ownerId:row.sourceOwnerId,version:page.version},after:{ownerId:a.ownerId,version:page.version+1,transferId:id,billingTransferred:false}}})
  return{ok:true,profileId:page.id,status:'ACCEPTED'}
 },{timeout:15000})
}
