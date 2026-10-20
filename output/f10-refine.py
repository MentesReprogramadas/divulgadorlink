from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
p=r/'frontend/src/middleware.test.ts';s=p.read_text(encoding='utf-8').replace("vi.fn().mockResolvedValue(Response.json({mode:'PAGE',slug:'ana',tenantHost:'tenant.test'}))", "vi.fn().mockImplementation(async()=>Response.json({mode:'PAGE',slug:'ana',tenantHost:'tenant.test'}))");p.write_text(s,encoding='utf-8')
p=r/'backend/src/repositories/profile-billing-repository.ts';s=p.read_text(encoding='utf-8');s="import {profileHostBases} from '@/domain/profiles/profile-host'\n"+s;marker='export async function billingCatalog(db: Prisma.TransactionClient, tenantId: string, runtime: BillingRuntime) {';helper='''async function tenantBillingRuntime(db:Prisma.TransactionClient,tenantId:string,runtime:BillingRuntime):Promise<BillingRuntime>{
 if(!runtime.delivered.has('profile.subdomain'))return runtime
 const tenant=await db.tenant.findUnique({where:{id:tenantId}}),configured=tenant&&Object.values(profileHostBases(process.env.PROFILE_HOST_BASES,runtime.production)).includes(tenant.host)
 return configured?runtime:{...runtime,delivered:new Set([...runtime.delivered].filter(key=>key!=='profile.subdomain'))}
}
''';s=s.replace(marker,helper+marker+'\n  runtime=await tenantBillingRuntime(db,tenantId,runtime)');s=s.replace('export async function readBillingAdmin(db: PrismaClient, actor: BillingActor, runtime: BillingRuntime) {','export async function readBillingAdmin(db: PrismaClient, actor: BillingActor, runtime: BillingRuntime) {\n  runtime=await tenantBillingRuntime(db,actor.tenantId,runtime)');s=s.replace('export async function saveProfilePlan(db: PrismaClient, actor: BillingActor, input: z.infer<typeof billingPlanInput>, runtime: BillingRuntime) {','export async function saveProfilePlan(db: PrismaClient, actor: BillingActor, input: z.infer<typeof billingPlanInput>, runtime: BillingRuntime) {\n  runtime=await tenantBillingRuntime(db,actor.tenantId,runtime)');p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/profile-hosts/profile-host-screen.tsx';s=p.read_text(encoding='utf-8').replace("data?.allowed?'Incluído no seu plano':'Plano com endereço próprio necessário'","data?.allowed?'Incluído no seu plano':data&&!data.bases.length?'Endereços próprios ainda indisponíveis':'Plano com endereço próprio necessário'");s=s.replace("action={!data?.allowed?<ButtonLink", "action={data?.bases.length&&!data.allowed?<ButtonLink");s=s.replace("data?.hasPage?'Escolha um endereço para sua página.':'Crie sua página antes de escolher um endereço.'", "data?.hasPage?data.bases.length?'Escolha um endereço para sua página.':'A plataforma ainda não liberou endereços próprios.':'Crie sua página antes de escolher um endereço.'");p.write_text(s,encoding='utf-8')
# Explicit local composition: real app challenge over disposable HTTP, not a TLS acceptance claim.
(r/'backend/scripts/e2e-profile-hosts.ts').write_text('''import {setProfileHostProbeForTest} from '../src/repositories/profile-hosts'
import {existsSync,readFileSync} from 'node:fs'
export function composeProfileHostsE2e(){
 if(process.env.NODE_ENV==='production')throw new Error('Local fixture only')
 setProfileHostProbeForTest(async(hostname,challenge)=>{
  if(!/^[a-z0-9-]+\\.pages\\.localhost$/.test(hostname))return false
  const control=new URL('../../frontend/e2e/.runtime/profile-host-probe.json',import.meta.url)
  if(existsSync(control)&&JSON.parse(readFileSync(control,'utf8')).fail)return false
  const port=3000+Number(process.env.E2E_PORT_OFFSET||0),response=await fetch('http://'+hostname+':'+port+'/.well-known/temlink-page/'+challenge,{signal:AbortSignal.timeout(5000)})
  return response.ok&&await response.text()==='temlink-page='+challenge
 })
}
''',encoding='utf-8')
p=r/'backend/scripts/e2e-billing-server.ts';s=p.read_text(encoding='utf-8');s="import {composeProfileHostsE2e} from './e2e-profile-hosts'\n"+s;s=s.replace('composeBillingE2e()','composeBillingE2e()\ncomposeProfileHostsE2e()');p.write_text(s,encoding='utf-8')
p=r/'frontend/e2e/serve.mjs';s=p.read_text(encoding='utf-8').replace("  TENANT_HOST: 'evolution.localhost',", "  PROFILE_HOST_BASES:JSON.stringify({'pages.localhost':'checklist.localhost'}),\n  TENANT_HOST: 'evolution.localhost',").replace("  TENANT_HOST: '',", "  PROFILE_HOST_BASES:JSON.stringify({'pages.localhost':'checklist.localhost'}),\n  TENANT_HOST: '',");p.write_text(s,encoding='utf-8')
