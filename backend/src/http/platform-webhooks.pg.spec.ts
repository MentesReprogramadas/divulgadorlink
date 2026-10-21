import {randomUUID} from 'node:crypto'
import {Prisma,PrismaClient} from '@prisma/client'
import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {env} from '@/env'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {composeWebhooksForTest,runWebhookCycle,purgeWebhooks} from '@/repositories/platform-webhooks'
import {verifyWebhook} from '@/domain/notifications/platform-webhook'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local database required')
const db=new PrismaClient({datasources:{db:{url}}}),originalKey=env.WEBHOOK_ENCRYPTION_KEY
let tenant:string,foreign:string,owner:string,other:string,niche:string,network:string,link:string
const post=vi.fn<(url:string,body:string,headers:Record<string,string>)=>Promise<number>>()
beforeAll(async()=>{setProfilesForTest(db);setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();niche=randomUUID();network=randomUUID();link=randomUUID()
 env.WEBHOOK_ENCRYPTION_KEY=Buffer.alloc(32,11).toString('base64');post.mockReset();post.mockResolvedValue(204);composeWebhooksForTest({resolve:async()=>['93.184.216.34'],post})
 for(const id of [tenant,foreign])await db.tenant.create({data:{id,host:id+'.test',name:'F30'}})
 for(const [id,t] of [[owner,tenant],[other,tenant]])await db.user.create({data:{id,tenantId:t,name:'PERSONAL_SENTINEL',passwordHash:'secret-fixture'}})
 await db.niche.create({data:{id:niche,tenantId:tenant,name:'Estudo',slug:'estudo'}});await db.network.create({data:{id:network,tenantId:tenant,name:'Site',slug:'site',knownHosts:[]}})
 await db.link.create({data:{id:link,tenantId:tenant,ownerId:owner,name:'Link',description:'EMAIL_SENTINEL',canonicalUrl:'https://example.com',nicheId:niche,networkId:network,status:'PUBLISHED'}})
})
afterAll(async()=>{env.WEBHOOK_ENCRYPTION_KEY=originalKey;composeWebhooksForTest(null);setProfilesForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',path:string,body?:unknown,user:string|null=owner,t=tenant,host=tenant){return app.inject({method,url:'/api/v1/me/integrations/'+path,headers:{host:host+'.test',...(user?{authorization:'Bearer '+app.jwt.sign({sub:user,tenantId:t,role:'USER',typ:'access'})}:{})},...(body?{payload:body}:{})})}
async function create(){const response=await call('POST','endpoints',{url:'https://hooks.example.com/receiver',eventTypes:['contact.received','link.approved','campaign.ended'],enabled:true});expect(response.statusCode,response.body).toBe(200);return response.json() as {secret:string;endpoint:{id:string;version:number}}}
async function approval(){const id=randomUUID();await db.operationalMessage.create({data:{id,tenantId:tenant,kind:'MODERATION_EMAIL',resourceId:link,occurrenceKey:'approval:'+id,payload:{outcome:'published'}}});return id}
async function deliveries(){return(await call('GET','endpoints')).json().deliveries as Array<{id:string;eventId:string;status:string;attempts:number;budget:number}>}
it('F30-T01/T02/T04/T05/U01 outbox transacional, assinatura e identidade estável após falha e reinício',async()=>{
 const {secret}=await create();post.mockResolvedValueOnce(500);await approval();const now=new Date(Date.now()+1000)
 await runWebhookCycle(db,now);expect((await deliveries())[0].status).toBe('PENDING');expect(post).toHaveBeenCalledTimes(1)
 const body=post.mock.calls[0][1],headers=post.mock.calls[0][2];expect(verifyWebhook(secret,headers['x-temlink-timestamp'],body,headers['x-temlink-signature'],now)).toBe(true);expect(body).not.toMatch(/PERSONAL_SENTINEL|EMAIL_SENTINEL|answers|tenantId|ownerId/)
 await runWebhookCycle(db,new Date(now.getTime()+15001));expect((await deliveries())[0].status).toBe('DELIVERED');expect(post.mock.calls[1][1]).toBe(body);expect(post.mock.calls[1][2]['x-temlink-event-id']).toBe(headers['x-temlink-event-id'])
 const response=await call('GET','endpoints');expect(response.body).not.toContain(secret);expect(response.body).not.toContain('previousSecret');expect(response.body).not.toContain('answers')
})
it('F30-PG01/I03 rollback não deixa intenção; ocorrência repetida e drains concorrentes não duplicam a entrega',async()=>{
 await create();const occurrence=randomUUID()
 await expect(db.$transaction(async tx=>{await tx.$executeRaw`SELECT queue_platform_webhook(${tenant},${owner},'contact.received',${occurrence},${randomUUID()})`;throw new Error('rollback')})).rejects.toThrow('rollback');expect(await deliveries()).toHaveLength(0)
 for(let i=0;i<2;i++)await db.$executeRaw`SELECT queue_platform_webhook(${tenant},${owner},'contact.received',${occurrence},${link})`
 expect(await deliveries()).toHaveLength(1);await Promise.all([runWebhookCycle(db),runWebhookCycle(db)]);expect(post).toHaveBeenCalledTimes(1)
 await expect(db.$executeRaw`INSERT INTO webhook_endpoints(id,"tenantId","ownerId",url,"eventTypes",secret) VALUES(${randomUUID()},${foreign},${owner},'https://example.com',ARRAY['contact.received'],'cipher')`).rejects.toThrow()
})
it('F30-T03/T07/U04 limite de cinco tentativas, retry manual limitado e desativação cancela próximos envios',async()=>{
 const {endpoint}=await create();await approval();post.mockResolvedValue(500);let now=Date.now()+1000
 for(let i=0;i<5;i++){await runWebhookCycle(db,new Date(now));now+=1000000}
 const [delivery]=await deliveries();expect(delivery.status).toBe('FAILED');expect(delivery.attempts).toBe(5);await runWebhookCycle(db,new Date(now));expect(post).toHaveBeenCalledTimes(5)
 expect((await call('POST','deliveries/'+delivery.id+'/retry')).statusCode).toBe(200);expect((await deliveries())[0].budget).toBe(10)
 expect((await call('POST','endpoints/'+endpoint.id+'/disable',{expectedVersion:1})).statusCode).toBe(200);await runWebhookCycle(db,new Date(now));expect(post).toHaveBeenCalledTimes(5);expect((await deliveries())[0].status).toBe('CANCELLED')
 await approval();expect(await deliveries()).toHaveLength(1)
})
it('F30-I02/T06 sem sessão, outro dono, tenant e DNS interno não configuram nem consultam segredos',async()=>{
 const {endpoint}=await create();expect((await call('GET','endpoints',undefined,null)).statusCode).toBe(401);expect((await call('GET','endpoints',undefined,owner,tenant,foreign)).statusCode).toBe(403);expect((await call('GET','endpoints',undefined,other)).json().endpoints).toEqual([])
 expect((await call('POST','endpoints/'+endpoint.id+'/disable',{expectedVersion:1},other)).statusCode).toBe(404)
 composeWebhooksForTest({resolve:async()=>['127.0.0.1'],post});expect((await call('POST','endpoints',{url:'https://rebind.example.com',eventTypes:['contact.received'],enabled:true})).statusCode).toBe(400)
 expect(post).not.toHaveBeenCalled();expect((await call('POST','endpoints/'+endpoint.id+'/disable',{expectedVersion:0})).statusCode).toBe(409)
})
it('F30-I01/T01 rotação mantém assinatura anterior por 300s; retenção elimina histórico e chave anterior',async()=>{
 const first=await create();await approval();const rotated=await call('POST','endpoints/'+first.endpoint.id+'/rotate-secret',{expectedVersion:1});expect(rotated.statusCode).toBe(200);const now=new Date()
 await runWebhookCycle(db,now);const [,body,h]=post.mock.calls[0];expect(verifyWebhook(first.secret,h['x-temlink-timestamp'],body,h['x-temlink-signature'],now)).toBe(true);expect(verifyWebhook(rotated.json().secret,h['x-temlink-timestamp'],body,h['x-temlink-signature'],now)).toBe(true)
 await purgeWebhooks(db,new Date(now.getTime()+31*86400000));expect(await deliveries()).toHaveLength(0)
 const [row]=await db.$queryRaw<Array<{previousSecret:string|null}>>`SELECT "previousSecret" FROM webhook_endpoints WHERE id=${first.endpoint.id}`;expect(row.previousSecret).toBe(null)
})
it('F30-PG02 fontes reais de contato e encerramento de campanha entram na mesma outbox sem respostas pessoais',async()=>{
 await create();const group=randomUUID(),content={slug:'contato',name:'Ana',bio:'Página',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:group,type:'URL',label:'Site',destination:'https://example.com',visible:true}]}
 const profile=await db.profile.create({data:{tenantId:tenant,ownerId:owner,slug:'contato',name:'Ana',publication:content,publishedVersion:1,version:1}})
 const form=await db.contactForm.create({data:{tenantId:tenant,ownerId:owner,profileId:profile.id}}),revision=await db.contactFormRevision.create({data:{tenantId:tenant,formId:form.id,number:1,definition:{enabled:true}}})
 await db.contactSubmission.create({data:{tenantId:tenant,formId:form.id,revisionId:revision.id,requestKey:randomUUID(),fingerprint:'fixture',answers:{email:'PRIVATE_CONTACT_SENTINEL@example.test'},expiresAt:new Date(Date.now()+180*86400000)}})
 const campaign=await db.campaignPage.create({data:{tenantId:tenant,ownerId:owner,profileId:profile.id,name:'Campanha',slug:'campanha',sourceRevisionId:randomUUID(),sourceVersion:1,sourceSnapshot:content,content,publication:content,publishedVersion:1,state:'PUBLISHED'}})
 await db.campaignPage.update({where:{id:campaign.id},data:{state:'ARCHIVED',publication:Prisma.DbNull,publishedVersion:null,version:2}})
 await db.campaignPage.update({where:{id:campaign.id},data:{state:'ARCHIVED'}})
 expect(await deliveries()).toHaveLength(2);await runWebhookCycle(db);expect(post).toHaveBeenCalledTimes(2)
 expect(post.mock.calls.map(([,body])=>JSON.parse(body).type).sort()).toEqual(['campaign.ended','contact.received']);expect(JSON.stringify(post.mock.calls)).not.toContain('PRIVATE_CONTACT_SENTINEL')
})
