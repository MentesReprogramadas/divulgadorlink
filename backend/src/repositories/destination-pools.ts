import {Prisma,type PrismaClient} from '@prisma/client'
import {canSubmitLinkFromIdentifiers} from '@/use-cases/@Auth/confirm-identifier'
import {RedirectError,validateRedirectDestination} from '@/use-cases/@Redirects/validate-destination'
import type {PublicContentValidationPorts} from '@/use-cases/public-content-validation-ports'
import {selectWeighted,type DestinationPoolInput} from '@/domain/redirects/destination-pool'
import {hitsBlocklist} from '@/domain/links/blocklist'
import {canonicalUrl} from '@/domain/links/canonical-url'
import {assertPublicHttps} from '@/adapters/http/safe-fetch'
import {analyticsDay} from '@/domain/analytics/day'
type Actor={tenantId:string;ownerId:string;actorId?:string}
type Db=Prisma.TransactionClient
type Pool={handleId:string;tenantId:string;ownerId:string;version:number;cursor:bigint;enabled:boolean}
type Member={revisionId:string;weight:number;paused:boolean;position:number;label:string;destinationUrl:string;handleId:string;requiresAge:boolean;eligible:boolean}
async function owned(db:Db,a:Actor,id:string,write=false){const user=await db.user.findFirst({where:{id:a.ownerId,tenantId:a.tenantId},include:{identifiers:true}});if(!user||user.status!=='ACTIVE'||write&&!canSubmitLinkFromIdentifiers(user.status,user.identifiers))throw new RedirectError(403,'Confirme seu e-mail antes de alterar convites.');const handle=await db.redirectHandle.findFirst({where:{id,tenantId:a.tenantId,ownerId:a.ownerId}});if(!handle)throw new RedirectError(404,'Convite não encontrado.');return handle}
async function getPool(db:Db,tenantId:string,id:string,lock=false){const rows=lock?await db.$queryRaw<Pool[]>`SELECT * FROM destination_pools WHERE "handleId"=${id} AND "tenantId"=${tenantId} FOR UPDATE`:await db.$queryRaw<Pool[]>`SELECT * FROM destination_pools WHERE "handleId"=${id} AND "tenantId"=${tenantId}`;return rows[0]}
async function members(db:Db,a:Actor,id:string){return db.$queryRaw<Member[]>`SELECT m."revisionId",m.weight,m.paused,m.position,d.label,d."destinationUrl",d."handleId",d."requiresAge",(d.status='APPROVED' AND h."activeRevisionId"=d.id AND NOT h.disabled AND h."ownerId"=${a.ownerId}) AS eligible FROM destination_pool_members m JOIN redirect_destinations d ON d.id=m."revisionId" AND d."tenantId"=m."tenantId" JOIN redirect_handles h ON h.id=d."handleId" AND h."tenantId"=d."tenantId" WHERE m."poolId"=${id} AND m."tenantId"=${a.tenantId} ORDER BY m.position`}
export async function readDestinationPool(db:PrismaClient,a:Actor,id:string){await owned(db,a,id);const pool=await getPool(db,a.tenantId,id),destinations=pool?await members(db,a,id):[];const metrics=pool?await db.$queryRaw<{revisionId:string;clicks:number}[]>`SELECT "revisionId",SUM(accesses)::int AS clicks FROM destination_pool_daily WHERE "poolId"=${id} AND day>=${new Date(Date.now()-180*86400000)} GROUP BY "revisionId"`:[];return{version:pool?.version??0,enabled:pool?.enabled??false,destinations,eligibleCount:destinations.filter(d=>d.eligible&&!d.paused).length,metrics,stablePath:'/r/'+id}}
async function candidates(db:Db,a:Actor,id:string,ids:string[]){const rows=await db.redirectDestination.findMany({where:{id:{in:ids},tenantId:a.tenantId,status:'APPROVED',handle:{ownerId:a.ownerId,tenantId:a.tenantId,disabled:false,id:{not:id}}},include:{handle:{select:{activeRevisionId:true}}}});return rows.filter(row=>row.handle.activeRevisionId===row.id)}
export async function saveDestinationPool(db:PrismaClient,a:Actor,id:string,input:DestinationPoolInput,ports:PublicContentValidationPorts){
 const handle=await owned(db,a,id,true);if(handle.disabled)throw new RedirectError(409,'Este endereço está desativado.')
 const rows=await candidates(db,a,id,input.destinations.map(d=>d.revisionId));if(rows.length!==input.destinations.length)throw new RedirectError(422,'Escolha somente destinos atuais, validados e da sua conta.');await Promise.all(rows.map(row=>validateRedirectDestination(row.destinationUrl,ports.probe)))
 await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;const current=await owned(tx,a,id,true);if(current.disabled)throw new RedirectError(409,'Este endereço está desativado.');const pool=await getPool(tx,a.tenantId,id,true)
 if((pool?.version??0)!==input.expectedVersion)throw new RedirectError(409,'A distribuição mudou. Atualize antes de salvar.');if((await candidates(tx,a,id,input.destinations.map(d=>d.revisionId))).length!==input.destinations.length)throw new RedirectError(409,'Um destino mudou durante a validação. Atualize a lista.')
 if(!pool)await tx.$executeRaw`INSERT INTO destination_pools("handleId","tenantId","ownerId") VALUES(${id},${a.tenantId},${a.ownerId})`;else await tx.$executeRaw`UPDATE destination_pools SET version=version+1,cursor=0,enabled=true WHERE "handleId"=${id}`
 await tx.$executeRaw`DELETE FROM destination_pool_members WHERE "poolId"=${id}`
 for(const [position,d] of input.destinations.entries())await tx.$executeRaw`INSERT INTO destination_pool_members("poolId","tenantId","revisionId",position,weight,paused) VALUES(${id},${a.tenantId},${d.revisionId},${position},${d.weight},${d.paused})`
 await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.ownerId,action:'redirect.pool.configured',entityType:'RedirectHandle',entityId:id,after:{version:(pool?.version??0)+1,destinations:input.destinations.length}}})
 });return readDestinationPool(db,a,id)
}
export async function disableDestinationPool(db:PrismaClient,a:Actor,id:string,expectedVersion:number){await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;await owned(tx,a,id,true);const pool=await getPool(tx,a.tenantId,id,true);if(!pool||pool.version!==expectedVersion)throw new RedirectError(409,'A distribuição mudou. Atualize antes de continuar.');await tx.$executeRaw`UPDATE destination_pools SET enabled=false,version=version+1 WHERE "handleId"=${id}`;await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.ownerId,action:'redirect.pool.disabled',entityType:'RedirectHandle',entityId:id}})});return readDestinationPool(db,a,id)}
export async function resolveDestinationPool(db:PrismaClient,tenantId:string,id:string,age:boolean,viewerId:string|null,now:Date,countAccess:boolean,advance=true){
 const initial=await getPool(db,tenantId,id);if(!initial?.enabled)return null
 return db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM users WHERE id=${initial.ownerId} AND "tenantId"=${tenantId} FOR UPDATE`
 const owner=await tx.user.findFirst({where:{id:initial.ownerId,tenantId,status:'ACTIVE'}}),handle=await tx.redirectHandle.findFirst({where:{id,tenantId,disabled:false,ownerId:initial.ownerId}}),pool=await getPool(tx,tenantId,id,true)
 const unavailable={available:false as const};if(!owner||!handle)return unavailable;if(!pool?.enabled)return null
 const a={tenantId,ownerId:owner.id},[terms,banned]=await Promise.all([tx.blocklistTerm.findMany({where:{tenantId},select:{term:true}}),tx.link.findMany({where:{tenantId,owner:{status:'BANNED'}},select:{canonicalUrl:true}})])
 const eligible=(await members(tx,a,id)).filter(d=>{if(!d.eligible||d.paused||hitsBlocklist({text:d.label,selectedNiche:'',nicheNames:[],terms:terms.map(t=>t.term)}))return false;try{assertPublicHttps(d.destinationUrl);return !banned.some(b=>canonicalUrl(b.canonicalUrl)===canonicalUrl(d.destinationUrl))}catch{return false}})
 const selected=selectWeighted(eligible,Number(pool.cursor));if(!selected)return unavailable;if(selected.requiresAge&&!age)return{restricted:true as const}
 await tx.$queryRaw`SELECT id FROM redirect_destinations WHERE id=${selected.revisionId} FOR SHARE`;await tx.$queryRaw`SELECT id FROM redirect_handles WHERE id=${selected.handleId} FOR SHARE`
 const active=await tx.redirectDestination.findFirst({where:{id:selected.revisionId,tenantId,status:'APPROVED',handle:{activeRevisionId:selected.revisionId,disabled:false,ownerId:owner.id,tenantId}}});if(!active)return unavailable
 const viewer=viewerId?await tx.user.findFirst({where:{id:viewerId,tenantId},select:{id:true,role:true}}):null
 if(advance&&(!viewer||viewer.id!==owner.id&&viewer.role!=='ADMIN')){const total=eligible.reduce((sum,row)=>sum+row.weight,0);await tx.$executeRaw`UPDATE destination_pools SET cursor=${(Number(pool.cursor)+1)%total} WHERE "handleId"=${id}`;if(countAccess){const day=new Date(analyticsDay(now)+'T00:00:00Z');await tx.$executeRaw`INSERT INTO destination_pool_daily("poolId","revisionId",day,accesses) VALUES(${id},${selected.revisionId},${day},1) ON CONFLICT("poolId","revisionId",day) DO UPDATE SET accesses=destination_pool_daily.accesses+1`}}
 return{available:true as const,destinationUrl:active.destinationUrl}
 },{timeout:10000})
}
export async function purgeDestinationPools(db:PrismaClient,now=new Date()){await db.$executeRaw`DELETE FROM destination_pool_daily WHERE day<${new Date(now.getTime()-180*86400000)}`}

export async function pausePoolDestination(db:PrismaClient,a:Actor,id:string,revisionId:string,paused:boolean,expectedVersion:number,ports:PublicContentValidationPorts){
 if(!paused){await owned(db,a,id,true);const [candidate]=await candidates(db,a,id,[revisionId]);if(!candidate)throw new RedirectError(422,'Atualize o convite antes de retomar.');await validateRedirectDestination(candidate.destinationUrl,ports.probe)}
 await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;await owned(tx,a,id,true);const pool=await getPool(tx,a.tenantId,id,true);if(!pool?.enabled||pool.version!==expectedVersion)throw new RedirectError(409,'A distribuição mudou. Atualize antes de continuar.');const selected=(await members(tx,a,id)).find(d=>d.revisionId===revisionId);if(!selected)throw new RedirectError(404,'Destino não encontrado.');if(!paused&&!selected.eligible)throw new RedirectError(409,'O convite mudou durante a validação.');await tx.$executeRaw`UPDATE destination_pool_members SET paused=${paused} WHERE "poolId"=${id} AND "revisionId"=${revisionId}`;await tx.$executeRaw`UPDATE destination_pools SET version=version+1,cursor=0 WHERE "handleId"=${id}`;await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.actorId??a.ownerId,action:paused?'redirect.pool.paused':'redirect.pool.resumed',entityType:'RedirectHandle',entityId:id,after:{revisionId}}})});return readDestinationPool(db,a,id)
}
