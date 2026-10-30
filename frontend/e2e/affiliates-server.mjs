import {createServer} from 'node:http'
import {spawn,spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

// SSR metadata only. All mutations are rejected; browser fixtures intercept the BFF.
const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const webPort=Number(process.env.AFFILIATE_UI_PORT??3016),metadataPort=Number(process.env.AFFILIATE_UI_METADATA_PORT??4458)
if(![webPort,metadataPort].every(port=>Number.isInteger(port)&&port>=1024&&port<=65535)||webPort===metadataPort)throw new Error('Invalid isolated fixture ports')
const metadata=createServer((request,response)=>{
  response.setHeader('content-type','application/json')
  if(request.method!=='GET'){response.writeHead(405);response.end('{}');return}
  const slug=/^\/api\/v1\/public\/affiliates\/(early-natal|early-retry)$/.exec(request.url??'')?.[1]
  response.writeHead(slug?200:404)
  response.end(JSON.stringify(slug?{name:'Presentes de Natal',description:'Convite isolado',available:true,joinMode:'REDIRECT',imageUrl:null,shareImageUrl:null}:{}))
})
let child,stopping=false
function shutdown(code=0){
  if(stopping)return
  stopping=true
  if(child?.pid){
    if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore',windowsHide:true})
    else{try{process.kill(-child.pid,'SIGTERM')}catch{/* Already stopped. */}}
  }
  metadata.close(()=>process.exit(code))
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>shutdown())
await new Promise((resolve,reject)=>{metadata.once('error',reject);metadata.listen(metadataPort,'127.0.0.1',resolve)})
const env={...process.env,TEMLINK_DEMO_BUILD:'0',TEMLINK_E2E_BUILD:'1',API_ORIGIN:'http://127.0.0.1:'+metadataPort}
const next=path.join(frontend,'node_modules/next/dist/bin/next')
function start(args){child=spawn(process.execPath,[next,...args],{cwd:frontend,env,stdio:'inherit',windowsHide:true,detached:process.platform!=='win32'});return child}
const built=await new Promise(resolve=>{const build=start(['build']);build.once('error',()=>resolve(1));build.once('exit',code=>resolve(code??1))})
child=undefined
if(built!==0)shutdown(1)
else{
  const server=start(['start','--port',String(webPort)])
  server.once('error',()=>shutdown(1));server.once('exit',code=>{child=undefined;shutdown(code??1)})
}
