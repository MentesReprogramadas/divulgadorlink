from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
def put(p,s):
 p=r/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
put('backend/src/domain/profiles/profile-host.ts','''import {ProfileError} from './profile'
export type ProfileHostBases=Record<string,string>
export function profileHostBases(raw:string|undefined,production=false):ProfileHostBases{return {}}
export function profileHostname(label:string,base:string):string{throw new ProfileError(400,'Endereço indisponível.')}
export function profileHostCovered(paid:boolean,published:boolean,tls:boolean){return false}
''')
put('backend/src/domain/profiles/profile-host.spec.ts','''import {expect,it} from 'vitest'
import {profileHostBases,profileHostname,profileHostCovered} from './profile-host'
import {appearanceInput} from './appearance'
it('F10-U01/T01 domínio exato, somente um nível, normalização e nomes reservados',()=>{expect(profileHostname(' Ana-Silva ','temlinkaqui.com')).toBe('ana-silva.temlinkaqui.com');for(const name of ['admin','www','api','links','painel','login','a.b','xn--user','-ana','ana.','ana/path','ana:443','a\\nb'])expect(()=>profileHostname(name,'temlinkaqui.com')).toThrow();expect(profileHostBases('{"temlinkaqui.com":"temlinkaqui.com"}',true)).toEqual({'temlinkaqui.com':'temlinkaqui.com'});expect(()=>profileHostBases('{"localhost":"localhost"}',true)).toThrow();expect(()=>profileHostBases('{"*.example.com":"example.com"}')).toThrow();expect(profileHostBases(undefined)).toEqual({})})
it('F10-U02/T03 capacidade, publicação e TLS são gates independentes',()=>{expect(profileHostCovered(true,true,true)).toBe(true);for(const args of [[false,true,true],[true,false,true],[true,true,false]])expect(profileHostCovered(...args as [boolean,boolean,boolean])).toBe(false)})
it('F10-U03 tema não injeta CSS ou HTML; capa tipada e dados antigos legíveis',()=>{const theme={background:'#ffffff',buttonColor:'#112233',backgroundStyle:'solid',buttonStyle:'filled',radius:'rounded',font:'modern',alignment:'center'};expect(appearanceInput.safeParse(theme).success).toBe(true);expect(appearanceInput.safeParse({...theme,coverStyle:'banner'}).success).toBe(true);expect(appearanceInput.safeParse({...theme,coverStyle:'url(javascript:alert(1))'}).success).toBe(false)})
''')
p=r/'backend/src/domain/profiles/profile-host.ts';p.write_text('''import {isIP} from 'node:net'
import {ProfileError} from './profile'
export type ProfileHostBases=Record<string,string>
const reserved=new Set(['www','api','admin','painel','login','cadastro','suporte','support','help','links','app','mail','email','smtp','ftp','static','assets','cdn','status','docs','temlinkaqui','localhost','billing','pagamento','checkout','auth','oauth','autodiscover','webmail','ns1','ns2','root','robots','sitemap','dev','staging','preview'])
const domain=(value:string,production:boolean)=>!isIP(value)&&value.length<=253&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(value)&&(!production||!value.endsWith('.localhost')&&!value.endsWith('.local')&&value!=='localhost')
export function profileHostBases(raw:string|undefined,production=false):ProfileHostBases{
 if(!raw?.trim())return {};let input:unknown;try{input=JSON.parse(raw)}catch{throw new Error('PROFILE_HOST_BASES precisa ser um objeto JSON.')}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('PROFILE_HOST_BASES inválido.')
 const result:ProfileHostBases={};for(const [base,tenant] of Object.entries(input)){if(typeof tenant!=='string'||base!==base.toLowerCase()||tenant!==tenant.toLowerCase()||!domain(base,production)||!domain(tenant,production))throw new Error('Raiz de subdomínio ou tenant inválido.');result[base]=tenant}return result
}
export function profileHostname(value:string,base:string):string{
 const label=value.trim().toLowerCase();if(!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/.test(label)||label.startsWith('xn--')||label.includes('--')||reserved.has(label))throw new ProfileError(400,'Use 3 a 40 letras sem acentos, números ou hífens. Esse nome pode estar reservado.')
 return label+'.'+base
}
export function profileHostCovered(paid:boolean,published:boolean,tls:boolean){return paid&&published&&tls}
''',encoding='utf-8')
p=r/'backend/src/domain/profiles/appearance.ts';s=p.read_text(encoding='utf-8').replace('  searchEnabled:',"  coverStyle:z.enum(['none','banner']).optional(),\n  searchEnabled:");p.write_text(s,encoding='utf-8')
p=r/'backend/prisma/schema.prisma';s=p.read_text(encoding='utf-8').replace('model Profile {','''model ProfileHostName {
 hostname String @id
 profileKey String
 @@map("profile_host_names")
}
model ProfileHost {
 hostname String @id
 tenantId String
 ownerId String
 profileId String
 profile Profile @relation(fields:[profileId,tenantId,ownerId],references:[id,tenantId,ownerId],onDelete:Cascade,onUpdate:NoAction)
 status String @default("PENDING")
 challenge String
 tlsVerifiedAt DateTime?
 version Int
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 @@index([tenantId,profileId])
 @@map("profile_hosts")
}
model Profile {
 hosts ProfileHost[]''');p.write_text(s,encoding='utf-8')
put('backend/prisma/migrations/20261020110000_profile_hosts/migration.sql','''CREATE TABLE profile_host_names (hostname TEXT PRIMARY KEY,"profileKey" TEXT NOT NULL);
CREATE TABLE profile_hosts (hostname TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,"profileId" TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',challenge TEXT NOT NULL,"tlsVerifiedAt" TIMESTAMP(3),version INTEGER NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT profile_hosts_identity_fk FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION,CONSTRAINT profile_hosts_state_check CHECK(status IN ('PENDING','ACTIVE','RETIRED','DISABLED') AND version>0 AND (status<>'ACTIVE' OR "tlsVerifiedAt" IS NOT NULL)));
CREATE INDEX profile_hosts_profile_idx ON profile_hosts("tenantId","profileId");
CREATE UNIQUE INDEX profile_hosts_one_active_key ON profile_hosts("profileId") WHERE status='ACTIVE';
CREATE UNIQUE INDEX profile_hosts_one_pending_key ON profile_hosts("profileId") WHERE status='PENDING';
''')
put('backend/src/repositories/profile-hosts.ts','''import {randomBytes} from 'node:crypto'
import type {Prisma,PrismaClient} from '@prisma/client'
import {ProfileError} from '@/domain/profiles/profile'
import {profileHostBases,profileHostname} from '@/domain/profiles/profile-host'
import type {ProfileActor} from '@/domain/access/profile-access'
import {assertProfileOwner} from './profiles-repository'
import {profilePaidCapabilityCoverage} from './profile-capability-coverage'
import {profileBillingRuntime} from '@/lib/profile-billing'
import {profileNow} from '@/lib/profile-clock'
import {fetchOwnershipFile} from '@/adapters/http/ownership-fetch'
export type ProfileHostProbe=(hostname:string,challenge:string)=>Promise<boolean>
const defaultProbe:ProfileHostProbe=async(hostname,challenge)=>{try{return (await fetchOwnershipFile('https://'+hostname+'/.well-known/temlink-page/'+challenge))==='temlink-page='+challenge}catch{return false}}
let testProbe:ProfileHostProbe|null=null
export function setProfileHostProbeForTest(probe:ProfileHostProbe|null){if(process.env.NODE_ENV==='production')throw new Error('Test composition unavailable');testProbe=probe}
export const configuredHostBases=()=>profileHostBases(process.env.PROFILE_HOST_BASES,process.env.NODE_ENV==='production')
const missing=()=>new ProfileError(404,'Endereço não encontrado.')
async function state(db:Prisma.TransactionClient,a:ProfileActor){const profile=await db.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}}});if(!profile)throw new ProfileError(400,'Crie sua página primeiro.');const rows=await db.profileHost.findMany({where:{profileId:profile.id,tenantId:a.tenantId,ownerId:a.ownerId},orderBy:{version:'desc'}});return {profile,rows,version:rows.reduce((n,row)=>Math.max(n,row.version),0)}}
const covered=(db:Prisma.TransactionClient,a:ProfileActor)=>profilePaidCapabilityCoverage(db,a,profileBillingRuntime().delivered,profileNow(),'profile.subdomain')
export async function readProfileHosts(db:PrismaClient,a:ProfileActor){await assertProfileOwner(db,a);const tenant=await db.tenant.findUniqueOrThrow({where:{id:a.tenantId}}),bases=Object.entries(configuredHostBases()).filter(([,host])=>host===tenant.host).map(([base])=>base),profile=await db.profile.findUnique({where:{tenantId_ownerId:{tenantId:a.tenantId,ownerId:a.ownerId}}});const {enabled}=await covered(db,a);if(!profile)return {hosts:[],version:0,bases,allowed:false,published:false,hasPage:false};const result=await state(db,a);return {hosts:result.rows.map(row=>({hostname:row.hostname,status:row.status,tlsVerifiedAt:row.tlsVerifiedAt?.toISOString()??null,version:row.version})),version:result.version,bases,allowed:enabled&&bases.length>0,published:Boolean(profile.publication),hasPage:true}}
async function locked<T>(db:PrismaClient,a:ProfileActor,expected:number,work:(tx:Prisma.TransactionClient,s:Awaited<ReturnType<typeof state>>)=>Promise<T>){return db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM users WHERE id=${a.ownerId} AND "tenantId"=${a.tenantId} FOR UPDATE`;await assertProfileOwner(tx,a,true);const value=await state(tx,a);if(value.version!==expected)throw new ProfileError(409,'O endereço mudou. Atualize os dados antes de continuar.');return work(tx,value)})}
async function audit(tx:Prisma.TransactionClient,a:ProfileActor,profileId:string,action:string,hostname:string){await tx.auditLog.create({data:{tenantId:a.tenantId,actorId:a.auditActorId??a.actorId??a.ownerId,entityType:'ProfileHost',entityId:profileId,action,after:{hostname}}})}
export async function reserveProfileHost(db:PrismaClient,a:ProfileActor,input:{name:string;base:string;expectedVersion:number}){
 return locked(db,a,input.expectedVersion,async(tx,s)=>{
 const tenant=await tx.tenant.findUniqueOrThrow({where:{id:a.tenantId}});if(configuredHostBases()[input.base]!==tenant.host)throw new ProfileError(400,'Raiz de endereço indisponível.');if(!(await covered(tx,a)).enabled)throw new ProfileError(403,'Seu plano não inclui endereço próprio ativo.');const hostname=profileHostname(input.name,input.base);
 if(await tx.tenant.findUnique({where:{host:hostname}}))throw new ProfileError(409,'Esse endereço pertence à plataforma.');const reserved=await tx.profileHostName.findUnique({where:{hostname}});if(reserved&&reserved.profileKey!==s.profile.id)throw new ProfileError(409,'Esse endereço já está reservado. Escolha outro.');const existing=s.rows.find(row=>row.hostname===hostname);if(existing&&['PENDING','ACTIVE'].includes(existing.status))return {saved:true};
 if(!reserved)await tx.profileHostName.create({data:{hostname,profileKey:s.profile.id}});await tx.profileHost.updateMany({where:{profileId:s.profile.id,status:'PENDING'},data:{status:'DISABLED'}});const data={status:'PENDING',challenge:randomBytes(32).toString('hex'),tlsVerifiedAt:null,version:s.version+1};await tx.profileHost.upsert({where:{hostname},create:{hostname,tenantId:a.tenantId,ownerId:a.ownerId,profileId:s.profile.id,...data},update:data});await audit(tx,a,s.profile.id,'profile.host.reserved',hostname);return {saved:true}
 })
}
export async function verifyProfileHost(db:PrismaClient,a:ProfileActor,hostname:string,expected:number){
 await assertProfileOwner(db,a,true);const s=await state(db,a);if(s.version!==expected)throw new ProfileError(409,'O endereço mudou. Atualize os dados.');const row=s.rows.find(row=>row.hostname===hostname&&['PENDING','ACTIVE'].includes(row.status));if(!row)throw missing();if(!(await covered(db,a)).enabled)throw new ProfileError(403,'Seu plano não inclui endereço próprio ativo.');if(!s.profile.publication)throw new ProfileError(400,'Publique sua página antes de ativar o endereço.');
 if(!await (testProbe??defaultProbe)(hostname,row.challenge))throw new ProfileError(503,'DNS ou HTTPS ainda não está pronto. Seu endereço continua reservado; tente verificar novamente.');
 return locked(db,a,expected,async(tx,current)=>{const actual=current.rows.find(item=>item.hostname===hostname);if(!actual||actual.challenge!==row.challenge||!['PENDING','ACTIVE'].includes(actual.status))throw missing();if(!(await covered(tx,a)).enabled||!current.profile.publication)throw new ProfileError(403,'Publicação ou plano indisponível.');await tx.profileHost.updateMany({where:{profileId:current.profile.id,status:'ACTIVE',hostname:{not:hostname}},data:{status:'RETIRED'}});await tx.profileHost.update({where:{hostname},data:{status:'ACTIVE',tlsVerifiedAt:profileNow(),version:current.version+1}});await audit(tx,a,current.profile.id,'profile.host.activated',hostname);return {saved:true}})
}
export async function disableProfileHost(db:PrismaClient,a:ProfileActor,hostname:string,expected:number){return locked(db,a,expected,async(tx,s)=>{if(!s.rows.some(row=>row.hostname===hostname))throw missing();await tx.profileHost.update({where:{hostname},data:{status:'DISABLED',version:s.version+1}});await audit(tx,a,s.profile.id,'profile.host.disabled',hostname);return {saved:true}})}
export async function resolveProfileHost(db:PrismaClient,tenantId:string,hostname:string,challenge?:string){
 const row=await db.profileHost.findFirst({where:{hostname,tenantId},include:{profile:{include:{owner:{select:{status:true}}}}}});if(!row||row.profile.owner.status!=='ACTIVE'||row.status==='DISABLED')throw missing();const tenant=await db.tenant.findUniqueOrThrow({where:{id:tenantId}}),valid=Object.entries(configuredHostBases()).some(([base,host])=>host===tenant.host&&hostname.endsWith('.'+base)&&hostname.slice(0,-base.length-1).indexOf('.')===-1);if(!valid)throw missing();
 if(challenge){if(challenge!==row.challenge)throw missing();return {proof:'temlink-page='+challenge}}
 if(!row.tlsVerifiedAt||!['ACTIVE','RETIRED'].includes(row.status)||!row.profile.publication)throw missing();const {enabled}=await covered(db,{tenantId,ownerId:row.ownerId,age:false});return {hostname,tenantHost:tenant.host,slug:row.profile.slug,mode:row.status==='RETIRED'||!enabled?'FALLBACK' as const:'PAGE' as const}
}
''')
p=r/'backend/src/http/controllers/@Profiles/routes.ts';s=p.read_text(encoding='utf-8');s="import * as hosts from '@/repositories/profile-hosts'\n"+s;marker='export async function profilesRoutes(app: FastifyInstance) {';s=s.replace(marker,marker+'''
  app.get('/me/profile/hosts',(q,r)=>run(q,r,true,(db,a)=>hosts.readProfileHosts(db,a)))
  app.post('/me/profile/hosts',(q,r)=>run(q,r,true,(db,a)=>hosts.reserveProfileHost(db,{...a,auditActorId:q.workspaceActor?.id},z.object({name:z.string().max(80),base:z.string().max(253),expectedVersion:profileVersion}).strict().parse(q.body))))
  app.post('/me/profile/hosts/verify',(q,r)=>run(q,r,true,(db,a)=>{const input=z.object({hostname:z.string().max(253),expectedVersion:profileVersion}).strict().parse(q.body);return hosts.verifyProfileHost(db,{...a,auditActorId:q.workspaceActor?.id},input.hostname,input.expectedVersion)}))
  app.delete('/me/profile/hosts',(q,r)=>run(q,r,true,(db,a)=>{const input=z.object({hostname:z.string().max(253),expectedVersion:profileVersion}).strict().parse(q.body);return hosts.disableProfileHost(db,{...a,auditActorId:q.workspaceActor?.id},input.hostname,input.expectedVersion)}))
  app.get('/profile-hosts/resolve',(q,r)=>run(q,r,false,(db,a)=>{const input=z.object({hostname:z.string().regex(/^[a-z0-9.-]{3,253}$/),challenge:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().parse(q.query);return hosts.resolveProfileHost(db,a.tenantId,input.hostname,input.challenge)}))
''');p.write_text(s,encoding='utf-8')
p=r/'backend/src/domain/access/workspace-permissions.ts';s=p.read_text(encoding='utf-8').replace('preview(?:\\/items)?|catalog','hosts(?:\\/verify)?|preview(?:\\/items)?|catalog');p.write_text(s,encoding='utf-8')
p=r/'backend/src/http/workspace-access.ts';s=p.read_text(encoding='utf-8').replace('profiles\\/|collections', 'profile-hosts\\/|profiles\\/|collections');p.write_text(s,encoding='utf-8')
p=r/'backend/src/domain/access/profile-access.ts';s=p.read_text(encoding='utf-8').replace(" if(method==='GET'&&[", " if(path==='/me/profile/hosts'||path==='/me/profile/hosts/verify')return method==='GET'?'READ':'PUBLISH'\n if(method==='GET'&&[");p.write_text(s,encoding='utf-8')
# Runtime only advertises a delivered subdomain capability when platform roots are configured.
p=r/'backend/src/domain/billing/billing-delivery.ts';s=p.read_text(encoding='utf-8').replace("'profile.analytics'])","'profile.analytics', 'profile.subdomain'])");p.write_text(s,encoding='utf-8')
p=r/'backend/src/lib/profile-billing.ts';s=p.read_text(encoding='utf-8');s="import {profileHostBases} from '@/domain/profiles/profile-host'\n"+s;s=s.replace('delivered: DELIVERED_PROFILE_CAPABILITIES,',"delivered:Object.keys(profileHostBases(process.env.PROFILE_HOST_BASES,env.NODE_ENV==='production')).length?DELIVERED_PROFILE_CAPABILITIES:new Set([...DELIVERED_PROFILE_CAPABILITIES].filter(key=>key!=='profile.subdomain')),");p.write_text(s,encoding='utf-8')
