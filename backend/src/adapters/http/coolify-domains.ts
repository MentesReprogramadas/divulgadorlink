import {z} from 'zod'
import {ProfileError} from '@/domain/profiles/profile'
import type {ProfileHostBases} from '@/domain/profiles/profile-host'
const unavailable=()=>new ProfileError(503,'Não foi possível conferir os endereços da plataforma. Tente novamente mais tarde.')
const identity=z.object({uuid:z.string().min(1).max(100)})
const fqdn=z.object({fqdn:z.string().nullable().optional()})
const application=identity.extend({fqdn:z.string().nullable().optional(),docker_compose_domains:z.unknown().optional()})
const entries=z.array(identity).min(1).max(100)
function hosts(value:string|null|undefined):string[]{return (value??'').split(',').filter(value=>value.trim()).map(value=>{const url=new URL(value.includes('://')?value.trim():'https://'+value.trim());if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw unavailable();return url.hostname.toLowerCase().replace(/\.$/,'')})}
function composeHosts(raw:unknown):string[]{
 if(raw===undefined||raw===null||raw==='')return[]
 const value=typeof raw==='string'?JSON.parse(raw) as unknown:raw
 const row=z.object({domain:z.string().nullable()});return (Array.isArray(value)?z.array(row).max(500).parse(value):Object.values(z.record(z.string(),row).parse(value))).flatMap(row=>hosts(row.domain))
}
function matches(hostname:string,occupied:string){return hostname===occupied||occupied.startsWith('*.')&&hostname.endsWith(occupied.slice(1))}
/** Live read on every decision; provider failures never become available names. */
export async function assertCoolifyHostAvailable(hostname:string,bases:ProfileHostBases){
 let occupied:string[]
 try{
  const raw=process.env.COOLIFY_API_URL,token=process.env.COOLIFY_API_TOKEN
  if(!raw||!token)throw unavailable()
  const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw unavailable()
  url.pathname=url.pathname.replace(/\/$/,'').replace(/\/api\/v1$/,'')+'/api/v1/'
  const signal=AbortSignal.timeout(5000)
  async function get(path:string):Promise<unknown>{
   const response=await fetch(new URL(path,url),{headers:{authorization:'Bearer '+token,accept:'application/json'},redirect:'error',cache:'no-store',signal})
   if(!response.ok||!response.body)throw unavailable()
   const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0
   try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>2_000_000)throw unavailable();parts.push(chunk.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown
  }
  const [servers,apps,services]=await Promise.all([get('servers').then(value=>entries.parse(value)),get('applications').then(value=>z.array(application).max(500).parse(value)),get('services').then(value=>z.array(identity).max(500).parse(value))])
  const router=process.env.COOLIFY_PROFILE_ROUTER_UUID
  // Only the explicitly identified page router may own the delegated wildcard.
  const delegated=new Set(apps.filter(app=>app.uuid===router).flatMap(app=>[...hosts(app.fqdn),...composeHosts(app.docker_compose_domains)]).filter(host=>Object.keys(bases).some(base=>host==='*.'+base)))
  const applicationHosts=apps.flatMap(app=>[...hosts(app.fqdn),...composeHosts(app.docker_compose_domains)].filter(host=>app.uuid!==router||!delegated.has(host)))
  const [serverHosts,serviceHosts,previewHosts]=await Promise.all([
   Promise.all(servers.map(server=>get('servers/'+encodeURIComponent(server.uuid)+'/domains').then(value=>z.array(z.object({domains:z.array(z.string()).max(10000)})).max(1000).parse(value).flatMap(row=>row.domains.flatMap(hosts))))).then(rows=>rows.flat().filter(host=>!delegated.has(host))),
   Promise.all(services.map(service=>get('services/'+encodeURIComponent(service.uuid)+'/applications').then(value=>z.array(fqdn).max(500).parse(value).flatMap(row=>hosts(row.fqdn))))).then(rows=>rows.flat()),
   Promise.all(apps.map(app=>get('applications/'+encodeURIComponent(app.uuid)+'/previews').then(value=>z.array(z.object({domains:z.string().nullable().optional(),docker_compose_domains:z.unknown().optional()})).max(500).parse(value).flatMap(row=>[...hosts(row.domains),...composeHosts(row.docker_compose_domains)])))).then(rows=>rows.flat()),
  ])
  occupied=[url.hostname,...applicationHosts,...serverHosts,...serviceHosts,...previewHosts]
 }catch{throw unavailable()}
 if(occupied.some(host=>matches(hostname,host)))throw new ProfileError(409,'Esse endereço está em uso pela plataforma. Escolha outro.')
}
