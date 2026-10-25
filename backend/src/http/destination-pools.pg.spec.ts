import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { app } from '@/app'
import { setRedirectsForTest } from '@/http/controllers/@Redirects/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import {setWorkspaceDbForTest} from '@/http/workspace-access'
import {resolveRedirect} from '@/repositories/redirects-repository'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'


const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, user: string, other: string, host: string, ports: PublicContentValidationPorts
beforeAll(async () => { setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); await app.ready() })
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); user = 'u-' + tenant; other = 'o-' + tenant; host = tenant + '.test'
  for (const id of [tenant, foreign]) {
    await db.tenant.create({ data: { id, host: id + '.test', name: 'F23 fixture' } })
    await db.config.create({ data: { tenantId: id, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.85' } })
  }
  for (const [id, tenantId] of [[user, tenant], [other, tenant], ['f-' + tenant, foreign]]) await db.user.create({ data: { id, tenantId, name: 'Responsável', role: id === other ? 'ADMIN' : 'USER', passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  ports = { probe: async () => 200, judge: async () => ({ pass: true, confidence: 0.99, reasons: [] }) }; setRedirectsForTest(db, ports);setWorkspaceDbForTest(db)
})
afterAll(async () => { setRedirectsForTest(null);setWorkspaceDbForTest(null); await db.$disconnect() })
function call(method: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, actor: string | null = user, tokenTenant = tenant, requestHost = host, cookie?: string) {
  return app.inject({ method, url: '/api/v1/' + path, headers: { host: requestHost, ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role: actor === other ? 'ADMIN' : 'USER', typ: 'access' }) } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { payload: body } : {}) })
}
const input = (expectedRevision = 0, destinationUrl = 'https://example.com/convite-a') => ({ expectedRevision, destinationUrl, label: 'Clube de estudos', requiresAge: false, requestKey: randomUUID() })
async function create(body = input()) { const r = await call('POST', 'me/redirects', body); expect(r.statusCode, r.body).toBe(200); return { body, ...r.json() } }


async function prepare(){const root=await create({...input(),label:'Base'}),a=await create({...input(),label:'Grupo A'}),b=await create({...input(0,'https://example.com/convite-b'),label:'Grupo B'});const destinations=[{revisionId:a.destinationRevision.id,weight:1,paused:false},{revisionId:b.destinationRevision.id,weight:3,paused:false}];const path='me/redirects/'+root.id+'/pool';const saved=await call('PUT',path,{destinations,expectedVersion:0});expect(saved.statusCode,saved.body).toBe(200);return{root,a,b,destinations,path}}
it('F23-I02 colaborador precisa de escrita em links permanentes e auditoria identifica quem configurou',async()=>{const {root,path,destinations}=await prepare();await db.$executeRaw`INSERT INTO workspace_memberships(id,"tenantId","ownerId","userId",grants) VALUES(${randomUUID()},${tenant},${user},${other},${JSON.stringify({invitations:{read:true,write:true}})}::jsonb)`;const headers={host,authorization:'Bearer '+app.jwt.sign({sub:other,tenantId:tenant,role:'ADMIN',typ:'access'}),'x-workspace-owner':user};const saved=await app.inject({method:'PUT',url:'/api/v1/'+path,headers,payload:{destinations,expectedVersion:1}});expect(saved.statusCode,saved.body).toBe(200);expect((await db.auditLog.findFirst({where:{tenantId:tenant,entityId:root.id,action:'redirect.pool.configured'},orderBy:{createdAt:'desc'}}))?.actorId).toBe(other);await db.$executeRaw`UPDATE workspace_memberships SET grants=${JSON.stringify({invitations:{read:true,write:false}})}::jsonb WHERE "ownerId"=${user}`;expect((await app.inject({method:'DELETE',url:'/api/v1/'+path,headers,payload:{expectedVersion:2}})).statusCode).toBe(403);expect((await call('GET',path)).json().enabled).toBe(true)})
it('F23-T01 todos os destinos exigem revisão atual, propriedade, HTTPS e disponibilidade; nenhuma mutação parcial',async()=>{
 const {root,a,destinations,path}=await prepare();const prior=(await call('GET',path)).json();ports.probe=async()=>404
 expect((await call('PUT',path,{destinations,expectedVersion:1})).statusCode).toBe(422);expect((await call('GET',path)).json().version).toBe(prior.version)
 ports.probe=async()=>200
 for(const input of [{destinations:[{revisionId:root.destinationRevision.id,weight:1,paused:false}],expectedVersion:1},{destinations:[{revisionId:randomUUID(),weight:1,paused:false}],expectedVersion:1}])expect((await call('PUT',path,input)).statusCode).toBe(422)
 expect((await call('PUT',path,{destinations:[{revisionId:a.destinationRevision.id,weight:0,paused:false}],expectedVersion:1})).statusCode).toBe(400)
 expect((await call('GET',path,undefined,null)).statusCode).toBe(401);expect((await call('GET',path,undefined,other)).statusCode).toBe(404);expect((await call('GET',path,undefined,user,tenant,foreign+'.test')).statusCode).toBe(403)
})
it('F23-T02 pausa confirmada impede escolha, inclusive em sessão aberta; não retoma revisão substituída',async()=>{
 const {root,b,path}=await prepare();const paused=await call('PATCH',path+'/'+b.destinationRevision.id,{paused:true,expectedVersion:1});expect(paused.statusCode,paused.body).toBe(200)
 for(let n=0;n<4;n++)expect((await call('GET','r/'+root.id,undefined,null)).headers.location).toBe('https://example.com/convite-a')
 await call('POST','me/redirects/'+b.id+'/destinations',input(1,'https://example.com/new-b'))
 expect((await call('PATCH',path+'/'+b.destinationRevision.id,{paused:false,expectedVersion:2})).statusCode).toBe(422)
})
it('F23-T03 cliques concorrentes preservam pesos e contagem por destino; resolver não consulta rede a cada clique',async()=>{
 const {root,a,b,path}=await prepare();let probes=0;ports.probe=async()=>{probes++;return 200}
 const calls=await Promise.all(Array.from({length:20},()=>call('GET','r/'+root.id,undefined,null)));expect(calls.every(r=>r.statusCode===302)).toBe(true);expect(calls.filter(r=>r.headers.location==='https://example.com/convite-a')).toHaveLength(5);expect(calls.filter(r=>r.headers.location==='https://example.com/convite-b')).toHaveLength(15);expect(probes).toBe(0)
 const metrics=(await call('GET',path)).json().metrics;expect(metrics.find((r:{revisionId:string})=>r.revisionId===a.destinationRevision.id).clicks).toBe(5);expect(metrics.find((r:{revisionId:string})=>r.revisionId===b.destinationRevision.id).clicks).toBe(15)
 const before=await db.$queryRaw<{cursor:bigint}[]>`SELECT cursor FROM destination_pools WHERE "handleId"=${root.id}`;await call('HEAD','r/'+root.id,undefined,null);expect((await db.$queryRaw<{cursor:bigint}[]>`SELECT cursor FROM destination_pools WHERE "handleId"=${root.id}`)[0].cursor).toBe(before[0].cursor)
 await resolveRedirect(db,tenant,root.id,true,ports,null,new Date(),false);expect((await call('GET',path)).json().metrics.reduce((s:number,m:{clicks:number})=>s+m.clicks,0)).toBe(20)
})
it('F23-T04 sem elegíveis não retorna Location; revisões substituídas, destinos desativados e idade continuam protegidos',async()=>{
 const {root,a,b,path}=await prepare();await call('POST','me/redirects/'+a.id+'/disable',{expectedRevision:1});await call('POST','me/redirects/'+b.id+'/destinations',input(1,'https://example.com/new-b'))
 const unavailable=await call('GET','r/'+root.id,undefined,null);expect(unavailable.statusCode).toBe(200);expect(unavailable.headers.location).toBeUndefined();expect(unavailable.json()).toEqual({available:false});expect(unavailable.body).not.toContain('example.com')
 const adult=await create({...input(),requiresAge:true});const saved=await call('PUT',path,{destinations:[{revisionId:adult.destinationRevision.id,weight:1,paused:false}],expectedVersion:1});expect(saved.statusCode,saved.body).toBe(200)
 expect((await call('GET','r/'+root.id,undefined,null)).json()).toEqual({restricted:true});expect((await call('GET','r/'+root.id,undefined,null,tenant,host,'age=yes')).statusCode).toBe(302)
})
it('F23-T05 distribuição muda sem trocar endereço; versão obsoleta não sobrescreve e retorno ao link permanente único é explícito',async()=>{
 const {root,destinations,path}=await prepare();expect((await call('PUT',path,{destinations:destinations.map(d=>({...d,paused:true})),expectedVersion:1})).json().stablePath).toBe('/r/'+root.id)
 expect((await call('PUT',path,{destinations,expectedVersion:1})).statusCode).toBe(409);expect((await call('GET','r/'+root.id,undefined,null)).json()).toEqual({available:false})
 expect((await call('DELETE',path,{expectedVersion:2})).statusCode).toBe(200);expect((await call('GET','r/'+root.id,undefined,null)).headers.location).toBe('https://example.com/convite-a')
 expect(await db.redirectDestination.count({where:{handleId:root.id}})).toBe(1)
})
