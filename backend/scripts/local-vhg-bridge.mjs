import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const catalogPath = /^\/(?:products\/search\?[^#\r\n]+|products\/MLB\d+\/items\?[^#\r\n]+|users\/\d{1,20})$/
export function bridgeAction(method, pathname, input) {
  if (method==='GET' && pathname==='/catalog/status') return {action:'status'}
  if (method==='POST' && pathname==='/catalog/request' && typeof input?.path==='string' && input.path.length<=2048 && catalogPath.test(input.path)) return {action:'catalog',path:input.path}
  if (method==='POST' && pathname==='/catalog/batch' && Array.isArray(input?.paths) && input.paths.length>0 && input.paths.length<=10 && input.paths.every(path=>typeof path==='string' && path.length<=2048 && catalogPath.test(path))) return {action:'catalogBatch',paths:input.paths}
  if (method==='POST' && pathname==='/api/generate' && typeof input?.url==='string' && input.url.length<=2048) {
    const url=new URL(input.url)
    if (url.protocol==='https:' && !url.username && !url.password && !url.port && ['mercadolivre.com.br','meli.la'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host))) return {action:'generate',url:url.href}
  }
  throw new Error('Consulta não permitida.')
}
export function authenticated(value,key) {
  const expected='Bearer '+key
  return typeof value==='string' && Buffer.byteLength(value)===Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(value),Buffer.from(expected))
}
export function verifiedGeneratedAffiliate(data,input,reference) {
  if(!data||data.status!==200||data.total_items!==1||data.total_success!==1||data.total_error!==0||!Array.isArray(data.urls)||data.urls.length!==1)throw new Error('Invalid generation envelope')
  const row=data.urls[0]
  if(!row||typeof row.origin_url!=='string'||!reference.sameSellerItem(row.origin_url,input.url)||row.tag!==input.tag||row.type_url!=='SOCIAL_PROFILE_ENCRYPTED'||typeof row.short_url!=='string'||typeof row.long_url!=='string')throw new Error('Unconfirmed generation origin')
  const short=new URL(row.short_url),full=new URL(row.long_url)
  if(short.protocol!=='https:'||short.hostname!=='meli.la'||short.username||short.password||short.port||full.protocol!=='https:'||full.hostname!=='www.mercadolivre.com.br'||full.username||full.password||full.port||full.pathname!=='/social/'+input.profile||full.searchParams.get('matt_word')!==input.tag||!full.searchParams.get('matt_tool')||!full.searchParams.get('ref'))throw new Error('Unconfirmed affiliate identity')
  const verified=reference.generatedAffiliate({url:short.href,fullUrl:full.href})
  if(verified.url!==short.href||verified.fullUrl!==full.href||verified.tag!==input.tag||verified.profile!==input.profile)throw new Error('Affiliate URLs do not match the generated row')
  return verified
}

// Executed in a short-lived process inside the existing panel container; no remote files or tokens are changed.
export const remoteProgram = `
${verifiedGeneratedAffiliate.toString()}
const {webcrypto}=require('node:crypto');
const Database=require('better-sqlite3');
const input=JSON.parse(Buffer.from(process.argv[2],'base64url').toString('utf8'));
const db=new Database(process.env.DATABASE_PATH,{readonly:true,fileMustExist:true});
const output=(status,body)=>process.stdout.write(JSON.stringify({status,body}));
let stage='connection';
async function unseal(value){const [iv,data]=value.split('.');const key=await webcrypto.subtle.importKey('raw',Buffer.from(process.env.ML_ENCRYPTION_KEY,'base64url'),'AES-GCM',false,['decrypt']);return Buffer.from(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(iv,'base64url')},key,Buffer.from(data,'base64url'))).toString('utf8')}
async function boundedJson(response){const reader=response.body.getReader();let size=0;const chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();throw Error('Response too large')}chunks.push(value)}}finally{reader.releaseLock()}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
(async()=>{
 const connection=db.prepare('select client_id,status,expires_at,access_token from ml_connections where id=?').get('primary');
 if(input.action==='status'){const session=db.prepare('select updated_at from affiliate_sessions where id=?').get('primary');output(200,{configured:!!connection,connected:!!connection&&connection.status==='connected'&&connection.expires_at>Date.now()+60000,clientId:connection?.client_id||null,status:!connection?'CONFIGURED':connection.status==='connected'?'CONNECTED':'RECONNECT',...(connection?.expires_at?{expiresAt:connection.expires_at}:{}),affiliateSessionConfigured:!!session});return}
 if(input.action==='catalog'||input.action==='catalogBatch'){
  const paths=input.action==='catalog'?[input.path]:input.paths;
  if(!Array.isArray(paths)||!paths.length||paths.length>10){output(400,{error:'invalid_paths'});return}
  for(const path of paths){
  if(!/^\\/(?:products\\/search\\?[^#\\r\\n]+|products\\/MLB\\d+\\/items\\?[^#\\r\\n]+|users\\/\\d{1,20})$/.test(path)||path.length>2048)throw Error('Invalid catalog path');
  }
  if(!connection||connection.status!=='connected'||connection.expires_at<=Date.now()+60000){output(409,{error:'central_connection_expired'});return}
  const token=await unseal(connection.access_token);
  const query=async(path)=>{
  let result;
  if(process.env.N8N_CATALOG_URL&&process.env.N8N_CATALOG_KEY){const response=await fetch(process.env.N8N_CATALOG_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Catalog-Key':process.env.N8N_CATALOG_KEY},body:JSON.stringify({action:'api',path:path,accessToken:token}),redirect:'error',signal:AbortSignal.timeout(25000)});const envelope=await boundedJson(response);result={status:response.ok?(envelope.statusCode||200):response.status,body:typeof envelope.body==='string'?JSON.parse(envelope.body):envelope.body}}
  else{const response=await fetch('https://api.mercadolibre.com'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});result={status:response.status,body:await boundedJson(response)}}
   const body=path.startsWith('/users/')?{id:result.body?.id,seller_reputation:{level_id:result.body?.seller_reputation?.level_id??null,power_seller_status:result.body?.seller_reputation?.power_seller_status??null}}:result.body;
   return result.status>=400?{path,status:result.status,body:{error:'catalog_provider_rejected'}}:{path,status:200,body};
  };
  if(input.action==='catalog'){const result=await query(paths[0]);output(result.status,result.body);return}
  const results=new Array(paths.length);let cursor=0;
  const worker=async()=>{while(cursor<paths.length){const index=cursor++;try{results[index]=await query(paths[index])}catch{results[index]={path:paths[index],status:502,body:{error:'catalog_provider_unavailable'}}}}};
  await Promise.all([worker(),worker()]);output(200,{results});return
 }
 if(input.action==='generate'){
  stage='reference_parsers';
  const referenceLibrary={exports:{}};
  (function(module,exports){__REFERENCE_BUNDLE__})(referenceLibrary,referenceLibrary.exports);
  const {productReference,sameSellerItem}=referenceLibrary.exports;
  if(!sameSellerItem(input.url,input.url)){output(400,{error:'seller_required'});return}
  const session=db.prepare('select credentials from affiliate_sessions where id=?').get('primary');
  if(!session){output(409,{error:'affiliate_session_missing'});return}
  stage='affiliate_session';
  const credentials=JSON.parse(await unseal(session.credentials));
  const ref=productReference(input.url),generatorUrl=ref.catalogId?'https://produto.mercadolivre.com.br/MLB-'+ref.itemId.slice(3)+'-_JM':input.url;
  const tag=input.tag,profile=input.profile;
  if(typeof tag!=='string'||typeof profile!=='string'||!tag||!profile){output(503,{error:'affiliate_identity_missing'});return}
  stage='affiliate_request';
  const response=await fetch('https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink',{method:'POST',headers:{Cookie:credentials.cookie,'x-csrf-token':credentials.csrf,Origin:'https://www.mercadolivre.com.br',Referer:'https://www.mercadolivre.com.br/afiliados/linkbuilder','Content-Type':'application/json',Accept:'application/json','User-Agent':'Mozilla/5.0'},redirect:'error',body:JSON.stringify({urls:[generatorUrl],tag}),signal:AbortSignal.timeout(30000)});
  if(!response.ok){output(response.status===401||response.status===403?409:502,{error:'affiliate_provider_rejected'});return}
  stage='affiliate_response';
  // The authenticated generator maps the exact seller URL to both links; a public social-page scrape may return 403 after successful creation.
  output(200,verifiedGeneratedAffiliate(await boundedJson(response),input,referenceLibrary.exports));return
 }
 output(400,{error:'unknown_action'});
})().catch(error=>output(502,{error:stage==='affiliate_response'?'affiliate_response_unconfirmed':'central_provider_unavailable',stage,errorType:error instanceof SyntaxError?'SyntaxError':error instanceof TypeError?'TypeError':'Error'})).finally(()=>db.close());
`

export function validSshTarget(host,container) {return /^[a-zA-Z0-9@.:-]+$/.test(host)&&/^panel-[a-zA-Z0-9-]+$/.test(container)}
export function executeRemote(input,{host,container,referenceBundle},timeoutMs=100000) {
  if(!validSshTarget(host,container)) throw new Error('Invalid SSH target')
  const payload=Buffer.from(JSON.stringify(input)).toString('base64url')
  return new Promise((resolve,reject)=>{
    const child=spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8',host,'docker','exec','-i',container,'node','-',payload],{stdio:['pipe','pipe','pipe'],windowsHide:true})
    let size=0,closed=false;const chunks=[]
    const fail=()=>{if(closed)return;closed=true;clearTimeout(timer);child.kill();reject(new Error('Não foi possível acessar a integração central.'))}
    const timer=setTimeout(fail,timeoutMs)
    child.stdout.on('data',chunk=>{size+=chunk.length;if(size>1100000)fail();else chunks.push(chunk)})
    child.stderr.on('data',()=>{}) // Provider/SSH diagnostics may contain account details; never relay them.
    child.on('error',fail);child.stdin.on('error',fail)
    child.on('close',code=>{if(closed)return;closed=true;clearTimeout(timer);if(code!==0){reject(new Error('A integração central está indisponível.'));return}try{const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!Number.isInteger(result.status)||result.status<200||result.status>599)throw Error();resolve(result)}catch{reject(new Error('Resposta central inválida.'))}})
    child.stdin.end(remoteProgram.replace('__REFERENCE_BUNDLE__',()=>referenceBundle||''))
  })
}

export function createBridgeLimiter({activeLimit=2,queueLimit=4,waitMs=12000}={}) {
  let active=0
  const waiting=[]
  const take=()=>{
    active++;let released=false
    return ()=>{
      if(released)return
      released=true;active--
      const next=waiting.shift()
      if(next){clearTimeout(next.timer);next.resolve(take())}
    }
  }
  return ()=>{
    if(active<activeLimit)return Promise.resolve(take())
    if(waiting.length>=queueLimit)return Promise.resolve(null)
    return new Promise(resolve=>{
      const next={resolve,timer:setTimeout(()=>{waiting.splice(waiting.indexOf(next),1);resolve(null)},waitMs)}
      waiting.push(next)
    })
  }
}

export function startBridge({key,host,container,referenceBundle,tag,profile,port=4452}) {
  if(!key||key.length<32)throw new Error('Private local bridge key required')
  const acquire=createBridgeLimiter()
  const server=createServer(async(request,response)=>{
    const send=(status,body)=>{response.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});response.end(JSON.stringify(body))}
    if(!authenticated(request.headers.authorization,key)){send(401,{message:'Acesso negado.'});return}
    const release=await acquire()
    if(!release){send(429,{message:'A integração central está ocupada. Aguarde.'});return}
    try{
      if(response.destroyed)return
      let size=0;const chunks=[]
      for await(const chunk of request){size+=chunk.length;if(size>8192){send(413,{message:'Solicitação muito grande.'});return}chunks.push(chunk)}
      const raw=Buffer.concat(chunks).toString('utf8'),input=bridgeAction(request.method,new URL(request.url,'http://127.0.0.1').pathname,raw?JSON.parse(raw):{})
      const result=await executeRemote({...input,...(input.action==='generate'?{tag,profile}:{})},{host,container,referenceBundle},input.action==='generate'?100000:35000)
      send(result.status,result.body)
    }catch{send(502,{message:'Não foi possível concluir a consulta da integração central. Confira a conexão ou sessão no VHG.'})}
    finally{release()}
  })
  server.headersTimeout=10000;server.requestTimeout=110000
  server.listen(port,'127.0.0.1',()=>console.log('VHG local bridge listening on loopback:'+port))
  return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const config=JSON.parse(readFileSync(new URL('../../output/local-affiliates/bridge-config.json',import.meta.url),'utf8'))
  const referenceBundle=readFileSync(new URL('../../output/local-affiliates/vhg-reference.cjs',import.meta.url),'utf8')
  startBridge({...config,referenceBundle})
}
