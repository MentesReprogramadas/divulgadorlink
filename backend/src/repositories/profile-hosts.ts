import {assertCloudflareHostAvailable} from '@/adapters/http/cloudflare-profile-dns'
import {assertCoolifyHostAvailable} from '@/adapters/http/coolify-domains'
import {canWorkspace,workspaceGrants} from '@/domain/access/workspace-permissions'
import {canSubmitLinkFromIdentifiers} from '@/use-cases/@Auth/confirm-identifier'
import {randomBytes} from 'node:crypto'
import type {Prisma,PrismaClient} from '@prisma/client'
import {ProfileError} from '@/domain/profiles/profile'
import {profileHostBases,profileHostname,profileHostCovered} from '@/domain/profiles/profile-host'
import type {ProfileActor} from '@/domain/access/profile-access'
import {assertProfileOwner} from './profiles-repository'
import {profilePaidCapabilityCoverage} from './profile-capability-coverage'
import {profileBillingRuntime} from '@/lib/profile-billing'
import {profileNow} from '@/lib/profile-clock'
import {fetchOwnershipFile} from '@/adapters/http/ownership-fetch'
export type ProfileHostProbe=(hostname:string,challenge:string)=>Promise<boolean>
const defaultProbe:ProfileHostProbe=async(hostname,challenge)=>{try{return (await fetchOwnershipFile('https://'+hostname+'/.well-known/temlink-page/'+challenge))==='temlink-page='+challenge}catch{return false}}
type InfrastructureGuard=(hostname:string)=>Promise<void>
let testInfrastructure:InfrastructureGuard|null=null
export function setProfileHostInfrastructureForTest(guard:InfrastructureGuard|null){if(process.env.NODE_ENV==='production')throw new Error('Test composition unavailable');testInfrastructure=guard}
const assertInfrastructure=(hostname:string)=>(testInfrastructure??(async value=>{const bases=configuredHostBases();await Promise.all([assertCoolifyHostAvailable(value,bases),assertCloudflareHostAvailable(value,bases)])}))(hostname)
let testProbe:ProfileHostProbe|null=null
export function setProfileHostProbeForTest(probe:ProfileHostProbe|null){if(process.env.NODE_ENV==='production')throw new Error('Test composition unavailable');testProbe=probe}
export const configuredHostBases=()=>profileHostBases(process.env.PROFILE_HOST_BASES,process.env.NODE_ENV==='production')
const missing=()=>new ProfileError(404,'Endereço não encontrado.')
async function state(db:Prisma.TransactionClient,a:ProfileActor){const profile=await db.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}}});if(!profile)throw new ProfileError(400,'Crie sua página primeiro.');const rows=await db.profileHost.findMany({where:{profileId:profile.id,tenantId:a.tenantId,ownerId:a.ownerId},orderBy:{version:'desc'}});return {profile,rows,version:rows.reduce((n,row)=>Math.max(n,row.version),0)}}
const covered=(db:Prisma.TransactionClient,a:ProfileActor)=>profilePaidCapabilityCoverage(db,a,profileBillingRuntime().delivered,profileNow(),'profile.subdomain')
export async function readProfileHosts(db:PrismaClient,a:ProfileActor){await assertProfileOwner(db,a);const tenant=await db.tenant.findUniqueOrThrow({where:{id:a.tenantId}}),bases=Object.entries(configuredHostBases()).filter(([,host])=>host===tenant.host).map(([base])=>base),profile=await db.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}}});const {enabled}=await covered(db,a);if(!profile)return {hosts:[],version:0,bases,allowed:false,published:false,hasPage:false};const result=await state(db,a);return {hosts:result.rows.map(row=>({hostname:row.hostname,status:row.status,tlsVerifiedAt:row.tlsVerifiedAt?.toISOString()??null,version:row.version})),version:result.version,bases,allowed:enabled&&bases.length>0,published:Boolean(profile.publication),hasPage:true}}
async function locked<T>(db:PrismaClient,a:ProfileActor,expected:number,work:(tx:Prisma.TransactionClient,s:Awaited<ReturnType<typeof state>>)=>Promise<T>){return db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;await assertProfileOwner(tx,a,true);
 if(a.auditActorId&&a.auditActorId!==a.ownerId){const [member,actor]=await Promise.all([tx.workspaceMembership.findUnique({where:{tenantId_ownerId_userId:{tenantId:a.tenantId,ownerId:a.ownerId,userId:a.auditActorId}}}),tx.user.findFirst({where:{id:a.auditActorId,tenantId:a.tenantId},include:{identifiers:true}})]);if(!member||member.revokedAt||!canWorkspace(workspaceGrants.parse(member.grants),'page',true)||!actor||!canSubmitLinkFromIdentifiers(actor.status,actor.identifiers))throw new ProfileError(403,'Seu acesso para alterar esta página foi removido.');}
 const value=await state(tx,a);if(value.version!==expected)throw new ProfileError(409,'O endereço mudou. Atualize os dados antes de continuar.');return work(tx,value)})}
async function audit(tx:Prisma.TransactionClient,a:ProfileActor,profileId:string,action:string,hostname:string){await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.actorId??a.ownerId,entityType:'ProfileHost',entityId:profileId,action,after:{hostname}}})}
export async function reserveProfileHost(db:PrismaClient,a:ProfileActor,input:{name:string;base:string;expectedVersion:number}){
 await assertProfileOwner(db,a,true)
 const tenant=await db.tenant.findUniqueOrThrow({where:{id:a.tenantId}})
 if(configuredHostBases()[input.base]!==tenant.host)throw new ProfileError(400,'Raiz de endereço indisponível.')
 await state(db,a)
 if(!(await covered(db,a)).enabled)throw new ProfileError(403,'Seu plano não inclui endereço próprio ativo.')
 const requestedHostname=profileHostname(input.name,input.base);await assertInfrastructure(requestedHostname)
 return locked(db,a,input.expectedVersion,async(tx,s)=>{
 const tenant=await tx.tenant.findUniqueOrThrow({where:{id:a.tenantId}});if(configuredHostBases()[input.base]!==tenant.host)throw new ProfileError(400,'Raiz de endereço indisponível.');if(!(await covered(tx,a)).enabled)throw new ProfileError(403,'Seu plano não inclui endereço próprio ativo.');const hostname=profileHostname(input.name,input.base);
 if(await tx.tenant.findUnique({where:{host:hostname}}))throw new ProfileError(409,'Esse endereço pertence à plataforma.');const reserved=await tx.profileHostName.findUnique({where:{hostname}});if(reserved&&reserved.profileKey!==s.profile.id)throw new ProfileError(409,'Esse endereço já está reservado. Escolha outro.');const existing=s.rows.find(row=>row.hostname===hostname);if(existing&&['PENDING','ACTIVE'].includes(existing.status))return {saved:true};
 if(await tx.auditLog.count({where:{tenantId:a.tenantId,entityId:s.profile.id,action:'profile.host.reserved',createdAt:{gt:new Date(profileNow().getTime()-3600000)}}})>=5)throw new ProfileError(429,'Você já reservou cinco endereços nesta hora. Tente novamente mais tarde.');
 if(!reserved)await tx.profileHostName.create({data:{hostname,profileKey:s.profile.id}});await tx.profileHost.updateMany({where:{profileId:s.profile.id,status:'PENDING'},data:{status:'DISABLED'}});const data={status:'PENDING',challenge:randomBytes(32).toString('hex'),tlsVerifiedAt:null,version:s.version+1};await tx.profileHost.upsert({where:{hostname},create:{hostname,tenantId:a.tenantId,ownerId:a.ownerId,profileId:s.profile.id,...data},update:data});await audit(tx,a,s.profile.id,'profile.host.reserved',hostname);return {saved:true}
 })
}
export async function verifyProfileHost(db:PrismaClient,a:ProfileActor,hostname:string,expected:number){
 await assertProfileOwner(db,a,true);const s=await state(db,a);if(s.version!==expected)throw new ProfileError(409,'O endereço mudou. Atualize os dados.');const row=s.rows.find(row=>row.hostname===hostname&&['PENDING','ACTIVE'].includes(row.status));if(!row)throw missing();if(!(await covered(db,a)).enabled)throw new ProfileError(403,'Seu plano não inclui endereço próprio ativo.');if(!s.profile.publication)throw new ProfileError(400,'Publique sua página antes de ativar o endereço.');
 await locked(db,a,expected,async(tx,current)=>{if(await tx.auditLog.count({where:{tenantId:a.tenantId,entityId:current.profile.id,action:'profile.host.probe',createdAt:{gt:new Date(profileNow().getTime()-3600000)}}})>=10)throw new ProfileError(429,'Limite de verificações nesta hora. Tente novamente mais tarde.');await audit(tx,a,current.profile.id,'profile.host.probe',hostname)});
 await assertInfrastructure(hostname)
 if(!await (testProbe??defaultProbe)(hostname,row.challenge))throw new ProfileError(503,'DNS ou HTTPS ainda não está pronto. Seu endereço continua reservado; tente verificar novamente.');
 await assertInfrastructure(hostname)
 return locked(db,a,expected,async(tx,current)=>{const actual=current.rows.find(item=>item.hostname===hostname);if(!actual||actual.challenge!==row.challenge||!['PENDING','ACTIVE'].includes(actual.status))throw missing();if(!(await covered(tx,a)).enabled||!current.profile.publication)throw new ProfileError(403,'Publicação ou plano indisponível.');await tx.profileHost.updateMany({where:{profileId:current.profile.id,status:'ACTIVE',hostname:{not:hostname}},data:{status:'RETIRED'}});await tx.profileHost.update({where:{hostname},data:{status:'ACTIVE',tlsVerifiedAt:profileNow(),version:current.version+1}});await audit(tx,a,current.profile.id,'profile.host.activated',hostname);return {saved:true}})
}
export async function disableProfileHost(db:PrismaClient,a:ProfileActor,hostname:string,expected:number){return locked(db,a,expected,async(tx,s)=>{if(!s.rows.some(row=>row.hostname===hostname))throw missing();await tx.profileHost.update({where:{hostname},data:{status:'DISABLED',version:s.version+1}});await audit(tx,a,s.profile.id,'profile.host.disabled',hostname);return {saved:true}})}
export async function resolveProfileHost(db:PrismaClient,tenantId:string,hostname:string,challenge?:string){
 const row=await db.profileHost.findFirst({where:{hostname,tenantId},include:{profile:{include:{owner:{select:{status:true}}}}}});if(!row||row.profile.owner.status!=='ACTIVE'||row.status==='DISABLED')throw missing();const tenant=await db.tenant.findUniqueOrThrow({where:{id:tenantId}}),valid=Object.entries(configuredHostBases()).some(([base,host])=>host===tenant.host&&hostname.endsWith('.'+base)&&hostname.slice(0,-base.length-1).indexOf('.')===-1);if(!valid)throw missing();
 try{await assertInfrastructure(hostname)}catch(error){if(error instanceof ProfileError&&error.status===409)throw missing();throw error}
 if(challenge){if(challenge!==row.challenge)throw missing();return {proof:'temlink-page='+challenge}}
 if(!row.tlsVerifiedAt||!['ACTIVE','RETIRED'].includes(row.status)||!row.profile.publication)throw missing();const {enabled}=await covered(db,{tenantId,ownerId:row.ownerId,age:false});return {hostname,tenantHost:tenant.host,slug:row.profile.slug,mode:row.status==='RETIRED'||!profileHostCovered(enabled,Boolean(row.profile.publication),Boolean(row.tlsVerifiedAt))?'FALLBACK' as const:'PAGE' as const}
}

/** Global public lookup: hostname and the configured root determine the tenant, never a forwarded Host. */
export async function resolveConfiguredProfileHost(db:PrismaClient,hostname:string,challenge?:string){
 const configured=Object.entries(configuredHostBases()).find(([base])=>hostname.endsWith('.'+base)&&!hostname.slice(0,-base.length-1).includes('.'));if(!configured)throw missing();const tenant=await db.tenant.findUnique({where:{host:configured[1]}});if(!tenant)throw missing();return resolveProfileHost(db,tenant.id,hostname,challenge)
}
