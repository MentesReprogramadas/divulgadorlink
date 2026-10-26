import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { getAuditLogsRepository, resetAuditLogsRepositoryForTest } from '@/repositories/audit-logs-repository'
import { getLinksRepository, InMemoryLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'
import { resetConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { readCatalogSeo, writeCatalogSeo } from '@/repositories/catalog-seo'
import { linkFingerprint } from '@/domain/catalog/seo-editorial'

const HOST = 'temlinkaqui.com'
const HOST_B = 'outro.example'
const TENANT = 'seed-temlinkaqui'
const TENANT_B = 'tenant-b'

function token(sub: string, tenantId = TENANT, role: 'USER' | 'ADMIN' = 'USER') {
  return app.jwt.sign({ sub, role, tenantId, typ: 'access' }, { expiresIn: '5m' })
}

describe('admin grava o resumo da faceta', () => {
  beforeAll(async () => {
    await app.ready()
    setTenantsRepositoryForTest(new InMemoryTenantsRepository([
      { id: TENANT, host: HOST, name: 'Tem Link Aqui' },
      { id: TENANT_B, host: HOST_B, name: 'Outro' },
    ]))
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    resetAuditLogsRepositoryForTest()
    resetConfigsRepositoryForTest()
    ;(getLinksRepository() as InMemoryLinksRepository).addUser({id:'ana',tenantId:TENANT,role:'ADMIN',status:'ACTIVE',identifiers:[]})
  })

  it('admin lê a régua pronta e grava resumo', async () => {
    const fat = 'd'.repeat(80)
    const headers = { host: HOST, authorization: `Bearer ${token('ana', TENANT, 'ADMIN')}` }
    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/facets', headers: { ...headers, authorization: `Bearer ${token('ana', TENANT, 'USER')}` } })
    expect(denied.statusCode).toBe(403)
    const foreign = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { host: HOST, authorization: `Bearer ${token('bia', TENANT_B, 'ADMIN')}`, 'content-type': 'application/json' }, payload: { summary: fat } })
    expect(foreign.statusCode).toBe(404)
    const saved = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: `  ${fat}  ` } })
    expect(saved.statusCode).toBe(200)
    expect(saved.json().summary).toBe(fat)
    const audit = await getAuditLogsRepository().latest({ tenantId: TENANT, entityType: 'Niche', entityId: 'niche-jogos', action: 'facet.summary.update' })
    expect(audit?.before).toEqual({ summary: null })
    expect(audit?.after).toEqual({ summary: fat })
    const listed = await app.inject({ method: 'GET', url: '/api/v1/admin/facets', headers })
    expect(listed.json().niches.find((row: { id: string }) => row.id === 'niche-jogos')).toMatchObject({ summary: fat, indexable: false, substantiveCount: 0 })
    const empty = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: '   ' } })
    expect(empty.json().summary).toBeNull()
    const huge = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: 'e'.repeat(501) } })
    expect(huge.statusCode).toBe(400)
    const markup = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/network/net-telegram', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: 'oi <b>' } })
    expect(markup.statusCode).toBe(400)
  })
  it('usa inventário real e prévia válida em adulto, não contagem de descrição longa', async()=>{
    const repo=getLinksRepository() as InMemoryLinksRepository
    const link=repo.addLink({id:'safe',tenantId:TENANT,status:'PUBLISHED',name:'Grupo',description:'Curta'})
    const headers={host:HOST,authorization:`Bearer ${token('ana',TENANT,'ADMIN')}`}
    const read=()=>app.inject({method:'GET',url:'/api/v1/admin/facets',headers})
    let listed=(await read()).json()
    expect(listed.niches.find((row:{id:string})=>row.id==='niche-jogos')).toMatchObject({indexable:true,substantiveCount:0})
    repo.links.find(row=>row.id===link.id)!.status='UNAVAILABLE'
    const adult=repo.addLink({id:'adult',tenantId:TENANT,status:'PUBLISHED',nicheId:'niche-apostas',name:'Conteúdo restrito',description:'Texto restrito'})
    expect((await read()).json().niches.find((row:{id:string})=>row.id==='niche-apostas').indexable).toBe(false)
    const state=await readCatalogSeo(TENANT)
    await writeCatalogSeo(TENANT,0,{...state,links:{[adult.id]:{title:'Comunidade adulta',description:'Apresentação pública.',explicit:false,approved:true,fingerprint:linkFingerprint(adult)}}},'ana','test-preview')
    listed=(await read()).json()
    expect(listed.niches.find((row:{id:string})=>row.id==='niche-apostas').indexable).toBe(true)
    expect(listed.niches.find((row:{id:string})=>row.id==='niche-jogos').indexable).toBe(false)
    repo.links.find(row=>row.id===adult.id)!.updatedAt=new Date('2026-11-01')
    expect((await read()).json().niches.find((row:{id:string})=>row.id==='niche-apostas').indexable).toBe(false)
  })
  it('bloqueia edição por admin banido ou papel que não corresponde ao cadastro',async()=>{
    const repo=getLinksRepository() as InMemoryLinksRepository
    repo.addUser({id:'ban',tenantId:TENANT,role:'ADMIN',status:'BANNED',identifiers:[]})
    repo.addUser({id:'user',tenantId:TENANT,role:'USER',status:'ACTIVE',identifiers:[]})
    for(const id of ['ban','user'])expect((await app.inject({method:'GET',url:'/api/v1/admin/facets',headers:{host:HOST,authorization:`Bearer ${token(id,TENANT,'ADMIN')}`}})).statusCode).toBe(403)
  })
})
