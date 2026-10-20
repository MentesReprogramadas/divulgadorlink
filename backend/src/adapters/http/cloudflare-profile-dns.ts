import {z} from 'zod'
import {ProfileError} from '@/domain/profiles/profile'
import type {ProfileHostBases} from '@/domain/profiles/profile-host'
const unavailable=()=>new ProfileError(503,'Não foi possível conferir os registros DNS da plataforma. Tente novamente mais tarde.')
const records=z.object({success:z.literal(true),result:z.array(z.object({name:z.string()})).max(1),result_info:z.object({total_count:z.number().int().nonnegative()})})
/** Authoritative API lookup: public DNS cannot distinguish explicit records from a wildcard. */
export async function assertCloudflareHostAvailable(hostname:string,bases:ProfileHostBases){
 let occupied=false
 try{
  const base=Object.keys(bases).sort((a,b)=>b.length-a.length).find(base=>hostname.endsWith('.'+base)),token=process.env.CLOUDFLARE_DNS_API_TOKEN
  const zones=z.record(z.string().regex(/^[a-f0-9]{32}$/i)).parse(JSON.parse(process.env.PROFILE_HOST_DNS_ZONES??'{}') as unknown),zoneId=base?zones[base]:undefined
  if(!base||!zoneId||!token)throw unavailable()
  const signal=AbortSignal.timeout(5000)
  async function get(path:string,query?:Record<string,string>){
   const url=new URL('https://api.cloudflare.com/client/v4/zones/'+zoneId+path);for(const [key,value] of Object.entries(query??{}))url.searchParams.set(key,value)
   const response=await fetch(url,{headers:{authorization:'Bearer '+token,accept:'application/json'},redirect:'error',cache:'no-store',signal})
   if(!response.ok||!response.body)throw unavailable()
   const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0
   try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>200_000)throw unavailable();parts.push(chunk.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown
  }
  const zone=z.object({success:z.literal(true),result:z.object({name:z.string(),status:z.literal('active')})}).parse(await get('')).result.name.toLowerCase()
  if(base!==zone&&!base.endsWith('.'+zone))throw unavailable()
  const ancestors:string[]=[];for(let name=base;name!==zone;name=name.slice(name.indexOf('.')+1))ancestors.push(name)
  const [candidate,delegations]=await Promise.all([get('/dns_records',{'name.exact':hostname,per_page:'1'}).then(value=>records.parse(value)),Promise.all(ancestors.map(name=>get('/dns_records',{'name.exact':name,type:'NS',per_page:'1'}).then(value=>records.parse(value))))])
  if(delegations.some(value=>value.result.length||value.result_info.total_count))throw unavailable()
  if(candidate.result.some(row=>row.name.toLowerCase().replace(/\.$/,'')!==hostname)||!candidate.result.length&&candidate.result_info.total_count>0)throw unavailable()
  occupied=candidate.result.length>0
 }catch{throw unavailable()}
 if(occupied)throw new ProfileError(409,'Esse endereço já possui um registro DNS da plataforma. Escolha outro.')
}
