import {request} from 'node:http'
import {setProfileHostProbeForTest} from '../src/repositories/profile-hosts'
import {existsSync,readFileSync} from 'node:fs'
export function composeProfileHostsE2e(){
 if(process.env.NODE_ENV==='production')throw new Error('Local fixture only')
 setProfileHostProbeForTest(async(hostname,challenge)=>{
  if(!/^[a-z0-9-]+\.pages\.localhost$/.test(hostname))return false
  const control=new URL('../../frontend/e2e/.runtime/profile-host-probe.json',import.meta.url)
  if(existsSync(control)&&JSON.parse(readFileSync(control,'utf8')).fail)return false
  const port=3000+Number(process.env.E2E_PORT_OFFSET||0)
  return new Promise<boolean>((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:'/.well-known/temlink-page/'+challenge,headers:{host:hostname+':'+port}},response=>{let body='';response.on('data',chunk=>{body+=String(chunk);if(body.length>4096)req.destroy(new Error('Fixture body too large'))});response.on('end',()=>resolve(response.statusCode===200&&body==='temlink-page='+challenge))});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(new Error('Fixture timeout')));req.end()})
 })
}
