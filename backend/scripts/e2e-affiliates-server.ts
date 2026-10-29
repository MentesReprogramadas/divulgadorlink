import { createServer } from 'node:http'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'
import { env } from '../src/env'
import { sealWebhookSecret } from '../src/lib/webhook-secret'
import { runAffiliateDiscovery } from '../src/use-cases/affiliates/discovery'

// Test fixture: local disposable database and loopback provider only, never account credentials.
const database = new URL(env.DATABASE_URL)
if (!['localhost','127.0.0.1'].includes(database.hostname) || database.pathname !== '/affiliate_ops_regression_20261028' || env.NODE_ENV === 'production' || env.PORT !== 3352 || env.AFFILIATE_EVOLUTION_BASE_URL !== 'http://127.0.0.1:4453' || env.JWT_SECRET !== 'affiliate-browser-fixture-secret') throw new Error('Isolated affiliate regression fixture configuration required')
const fixtureOrigin='http://127.0.0.1:4453',fixtureCatalogKey='fixture-api-key'
if ((env.AFFILIATE_CATALOG_GATEWAY_URL && (env.AFFILIATE_CATALOG_GATEWAY_URL!==fixtureOrigin || env.AFFILIATE_CATALOG_GATEWAY_KEY!==fixtureCatalogKey)) || (env.AFFILIATE_SERVICE_URL && (env.AFFILIATE_SERVICE_URL!==fixtureOrigin || env.AFFILIATE_SERVICE_KEY!==fixtureCatalogKey || env.AFFILIATE_TAG!=='fixture-tag' || env.AFFILIATE_PROFILE!=='fixture-profile')) || (env.AFFILIATE_EVOLUTION_API_KEY && env.AFFILIATE_EVOLUTION_API_KEY!=='affiliate-fixture-api-key')) throw new Error('External provider configuration is forbidden in this fixture')
const tenantId='affiliate-browser-tenant',actorId='affiliate-browser-admin',instanceId='affiliate-browser-instance',segmentId='affiliate-browser-segment'
type Group={id:string;subject:string;size:number;desc:string}
const groups=new Map<string,Group>([['123@g.us',{id:'123@g.us',subject:'Natal integrado #1',size:10,desc:'Presentes e ofertas de Natal.'}]])
let nextGroupId=456
const catalogProduct={id:'MLB123456',name:'Presente para Natal',pictures:[{url:'https://http2.mlstatic.com/fixture-product.jpg'}]}
const stub=createServer((request,response)=>{
  const chunks:Buffer[]=[]
  request.on('data',(chunk:Buffer)=>chunks.push(chunk))
  request.on('end',()=>{
    response.setHeader('content-type','application/json')
    const url=new URL(request.url!,'http://127.0.0.1:4453'),body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()) as Record<string,unknown>:{}
    if(['/catalog/status','/catalog/request','/catalog/batch','/api/generate'].includes(url.pathname)) {
      if(request.headers.authorization!=='Bearer '+fixtureCatalogKey){response.statusCode=401;response.end('{}');return}
      if(request.method==='GET'&&url.pathname==='/catalog/status')response.end(JSON.stringify({configured:true,connected:true,clientId:'123456',status:'CONNECTED',expiresAt:Date.now()+3600000}))
      else if(request.method==='POST'&&url.pathname==='/catalog/request'&&typeof body.path==='string'&&body.path.startsWith('/products/search?'))response.end(JSON.stringify({results:[catalogProduct],paging:{total:1}}))
      else if(request.method==='POST'&&url.pathname==='/catalog/request'&&body.path==='/users/12345')response.end(JSON.stringify({id:12345,seller_reputation:{level_id:'5_green',power_seller_status:null}}))
      else if(request.method==='POST'&&url.pathname==='/catalog/request'&&typeof body.path==='string'&&body.path.startsWith('/products/MLB123456/items?'))response.end(JSON.stringify({results:[{item_id:'MLB987654321',seller_id:12345,currency_id:'BRL',condition:'new',price:39.9,original_price:59.9,status:'active',available_quantity:5}],paging:{total:1}}))
      else if(request.method==='POST'&&url.pathname==='/catalog/batch') {
        const paths=body.paths
        if(!Array.isArray(paths)||!paths.length||paths.length>10||!paths.every(path=>typeof path==='string'&&path.length<=2048&&/^\/(?:products\/search\?[^#\r\n]+|products\/MLB\d+\/items\?[^#\r\n]+|users\/\d{1,20})$/.test(path))) {response.statusCode=400;response.end('{}');return}
        response.end(JSON.stringify({results:paths.map(path=>({path,status:200,body:path.startsWith('/products/search?')?{results:[catalogProduct],paging:{total:1}}:path.startsWith('/products/MLB123456/items?')?{results:[{item_id:'MLB987654321',seller_id:12345,currency_id:'BRL',condition:'new',price:39.9,original_price:59.9,status:'active',available_quantity:5}],paging:{total:1}}:path==='/users/12345'?{id:12345,seller_reputation:{level_id:'5_green',power_seller_status:null}}:{results:[],paging:{total:0}}}))}))
      }
      else if(request.method==='POST'&&url.pathname==='/api/generate'&&body.url==='https://produto.mercadolivre.com.br/MLB-987654321-_JM')response.end(JSON.stringify({url:'https://meli.la/fixture-generated',fullUrl:'https://www.mercadolivre.com.br/social/fixture-profile?matt_word=fixture-tag&matt_tool=fixture&ref=fixture',tag:'fixture-tag',profile:'fixture-profile'}))
      else {response.statusCode=400;response.end('{}')}
      return
    }
    if(request.headers.apikey!=='affiliate-fixture-api-key'){response.statusCode=401;response.end('{}');return}
    let data:unknown
    if(url.pathname.includes('findGroupInfos'))data=groups.get(url.searchParams.get('groupJid')!)
    else if(url.pathname.includes('inviteCode'))data={inviteCode:url.searchParams.get('groupJid')==='123@g.us'?'AbCdEf0123456789AbCdEf':'ZyXwVu0123456789ZyXwVu'}
    else if(url.pathname.includes('fetchAllGroups'))data=[...groups.values()]
    else if(url.pathname.includes('fetchProfilePictureUrl'))data={wuid:body.number,profilePictureUrl:null}
    else if(url.pathname.includes('/group/create/')){const group={id:`${nextGroupId++}@g.us`,subject:String(body.subject),size:1,desc:String(body.description??'')};groups.set(group.id,group);data=group}
    else if(url.pathname.includes('updateGroupDescription')||url.pathname.includes('updateGroupPicture'))data={update:'success'}
    else if(url.pathname.includes('connectionState'))data={instance:{state:'open'}}
    else if(url.pathname.includes('instance/connect'))data={instance:{state:'open'}}
    else if(url.pathname.includes('message/send'))data={key:{id:'fixture-'+Date.now()}}
    if(data===undefined){response.statusCode=404;response.end('{}');return}
    response.end(JSON.stringify(data))
  })
})

async function start(){
  const existing=await prisma.tenant.findUnique({where:{id:tenantId}})
  if(existing && existing.name!=='Afiliados teste integrado')throw new Error('Unexpected fixture tenant')
  if(existing)await prisma.$transaction(async tx=>{
    await tx.affiliateDelivery.deleteMany({where:{tenantId}});await tx.affiliateBroadcast.deleteMany({where:{tenantId}});await tx.affiliateOffer.deleteMany({where:{tenantId}});await tx.affiliateGroup.deleteMany({where:{tenantId}});await tx.affiliateSegment.deleteMany({where:{tenantId}});await tx.affiliateInstance.deleteMany({where:{tenantId}});await tx.auditLog.deleteMany({where:{tenantId}});await tx.userIdentifier.deleteMany({where:{tenantId}});await tx.user.deleteMany({where:{tenantId}});await tx.tenant.delete({where:{id:tenantId}})
  })
  await prisma.tenant.create({data:{id:tenantId,host:'localhost',name:'Afiliados teste integrado'}})
  await prisma.user.create({data:{id:actorId,tenantId,name:'Admin integrado',role:'ADMIN',passwordHash:'fixture-only',identifiers:{create:[{tenantId,kind:'EMAIL',normalizedValue:'affiliate-browser@example.test',confirmedAt:new Date()},{tenantId,kind:'PHONE',normalizedValue:'5511999999999',confirmedAt:new Date()}]}}})
  await prisma.affiliateInstance.create({data:{id:instanceId,tenantId,name:'Natal teste',ownerPhone:'5511999999999',secret:sealWebhookSecret('affiliate-fixture-api-key',env.WEBHOOK_ENCRYPTION_KEY,`affiliate-instance:${tenantId}:Natal teste`)}})
  await prisma.affiliateSegment.create({data:{id:segmentId,tenantId,name:'Natal integrado',slug:'natal-browser',description:'Presentes e ofertas de Natal.',capacity:10,autoExpand:true,instanceId,nextSequence:2}})
  await prisma.affiliateSegmentInstance.create({data:{tenantId,segmentId,instanceId}})
  await prisma.affiliateGroup.create({data:{tenantId,segmentId,instanceId,jid:'123@g.us',name:'Natal integrado #1',sequence:1,participantCount:10,capacity:10}})
  await prisma.affiliateOffer.create({data:{id:'affiliate-browser-offer',tenantId,segmentId,title:'Presente integrado',productUrl:'https://www.mercadolivre.com.br/p/MLB123',affiliateUrl:'https://meli.la/fixture',priceCents:1990,note:'Oferta de teste local.'}})
  await new Promise<void>(resolve=>stub.listen(4453,'127.0.0.1',resolve))
  await app.listen({host:'127.0.0.1',port:3352})
  const discoveryTimer=setInterval(()=>{void runAffiliateDiscovery(prisma).catch(()=>console.error('affiliate.fixture.discovery.failed'))},1000)
  for(const signal of ['SIGINT','SIGTERM'] as const) process.once(signal,()=>{clearInterval(discoveryTimer);void app.close().then(()=>{stub.close();return prisma.$disconnect()}).then(()=>process.exit(0))})
  console.log('Affiliate integration fixture ready on 3352; loopback provider4453')
}
void start().catch(error=>{console.error(error);process.exit(1)})
