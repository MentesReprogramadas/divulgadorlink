import {lookup} from 'node:dns/promises'
import {env} from '../src/env'
import {safePost} from '../src/adapters/http/safe-fetch'
import {composeWebhooksForTest} from '../src/repositories/platform-webhooks'
export function composePlatformWebhooksE2e(){
 if(env.NODE_ENV==='production')throw new Error('Local webhook fixture only')
 env.WEBHOOK_ENCRYPTION_KEY=Buffer.alloc(32,13).toString('base64')
 const resolve=async(host:string)=>host==='receiver.f30.example'?['93.184.216.34']:(await lookup(host,{all:true})).map(row=>row.address)
 composeWebhooksForTest({resolve,post:(url,body,headers)=>safePost(url,body,headers,resolve,async(target,outgoing)=>{
  if(target.hostname!=='receiver.f30.example'||!outgoing)throw new Error('Synthetic webhook destination required')
  const response=await fetch('http://127.0.0.1:'+(4099+Number(process.env.E2E_PORT_OFFSET||0))+'/platform-webhooks/receive',{method:'POST',headers:outgoing.headers,body:outgoing.body,signal:AbortSignal.timeout(5000),redirect:'manual'})
  return{status:response.status,headers:response.headers,body:new Uint8Array(await response.arrayBuffer())}
 })})
}
