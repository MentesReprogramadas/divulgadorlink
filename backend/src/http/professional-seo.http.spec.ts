import { beforeAll, beforeEach, expect, it } from 'vitest'
import { app } from '@/app'
import { getLinksRepository, InMemoryLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { getConfigsRepository, resetConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { linkFingerprint, type SeoEditorial } from '@/domain/catalog/seo-editorial'
import { resetCatalogLinksForTest,setCatalogLinksForTest } from '@/http/controllers/@Catalog/routes'

const host = 'temlinkaqui.com'
const tenantId = 'seed-temlinkaqui'
const get = (path: string, cookie?: string) => app.inject({ method: 'GET', url: '/api/v1' + path, headers: { host, ...(cookie ? { cookie } : {}) } })
function repo() {
  const value = getLinksRepository()
  if (!(value instanceof InMemoryLinksRepository)) throw Error('Expected memory repository')
  return value
}
beforeAll(async () => { await app.ready() })
beforeEach(() => { resetLinksRepositoryForTest(); resetConfigsRepositoryForTest(); resetCatalogLinksForTest() })
async function editorial(value:Partial<SeoEditorial>){await getConfigsRepository().create({tenantId,key:'CATALOG_SEO_EDITORIAL',value:JSON.stringify({version:1,facets:{},links:{},collections:[],...value})})}

it('uses research-oriented copy and excludes empty facets from indexing and sitemap', async () => {
  const home = await get('/home')
  expect(home.json().seo.title).toContain('Grupos, canais e links')
  const empty = await get('/networks/telegram')
  expect(empty.json().seo.title).toContain('Grupos e canais do Telegram')
  expect(empty.json().seo.robots).toBe('noindex,follow')
  const sitemap = await get('/sitemap')
  expect(sitemap.json().entries.map((r: {path:string}) => r.path)).not.toContain('/rede/telegram')
  expect(sitemap.json().entries.map((r: {path:string}) => r.path)).toContain('/divulgar')
})

it('never serializes restricted link text, media or destination to an unconfirmed visitor', async () => {
  repo().addLink({ id: 'restricted', tenantId, status: 'PUBLISHED', nicheId: 'niche-apostas', name: 'restricted-title-sentinel', description: 'restricted-description-sentinel' })
  for (const cookie of [undefined, 'age=no']) {
    const response = await get('/links/restricted', cookie)
    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain('restricted-title-sentinel')
    expect(response.body).not.toContain('restricted-description-sentinel')
    expect(response.json()).not.toHaveProperty('goPath')
    expect(response.json()).not.toHaveProperty('surfaceToken')
    expect(response.json().requiresAge).toBe(true)
    expect(response.json().seo.robots).toBe('noindex,nofollow')
  }
  const confirmed = await get('/links/restricted', 'age=yes')
  expect(confirmed.json().name).toBe('restricted-title-sentinel')
  expect(confirmed.json().requiresAge).toBe(true)
})

it('applies the same age boundary to a restricted network in a nonrestricted niche', async () => {
  repo().networks[0]!.requiresAge = true
  repo().addLink({ id: 'network-restricted', tenantId, status: 'PUBLISHED', name: 'network-secret-sentinel' })
  const response = await get('/links/network-restricted')
  expect(response.body).not.toContain('network-secret-sentinel')
  expect(response.json().requiresAge).toBe(true)
})

it('indexes an approved adult preview and collection without revealing restricted content; edits revoke eligibility',async()=>{
  const niche={...repo().niches[0]!,id:'adult',slug:'adulto',name:'Adulto',requiresAge:true}
  repo().niches.push(niche)
  const link=repo().addLink({id:'adult-link',tenantId,status:'PUBLISHED',nicheId:niche.id,name:'restricted-original-sentinel',description:'restricted-body-sentinel'})
  const copy={title:'Comunidade adulta autorizada',description:'Apresentação pública aprovada para maiores de 18 anos.',explicit:true,approved:true}
  await editorial({links:{[link.id]:{...copy,fingerprint:linkFingerprint(link)}},collections:[{...copy,slug:'telegram-adulto',networkSlug:'telegram',nicheSlug:'adulto'}]})
  const detail=await get('/links/'+link.id)
  expect(detail.json().seo).toMatchObject({robots:'index,follow',rating:'adult'})
  expect(detail.body).not.toContain('restricted-original-sentinel')
  expect(detail.json().name).toBe(copy.title)
  const collection=await get('/catalog-collections/telegram-adulto')
  expect(collection.statusCode).toBe(200)
  expect(collection.json().previews).toEqual([{id:link.id,name:copy.title,description:copy.description}])
  expect(collection.body).not.toContain('restricted-body-sentinel')
  expect((await get('/catalog-collections')).json().collections).toEqual([expect.objectContaining({slug:'telegram-adulto',networkSlug:'telegram',nicheSlug:'adulto',explicit:true})])
  expect((await get('/catalog-collections')).body).not.toContain('restricted-body-sentinel')
  expect(collection.json().seo).toMatchObject({robots:'index,follow',canonical:'https://temlinkaqui.com/descobrir/telegram-adulto',rating:'adult'})
  expect(collection.json().organic).toEqual([])
  const paths=(await get('/sitemap')).json().entries.map((row:{path:string})=>row.path)
  expect(paths).toEqual(expect.arrayContaining(['/nicho/adulto','/link/adult-link','/descobrir/telegram-adulto']))
  repo().links.find(row=>row.id===link.id)!.description='changed-sentinel'
  const changed=await get('/links/'+link.id)
  expect(changed.json().seo.robots).toBe('noindex,nofollow')
  expect(changed.body).not.toContain(copy.description)
  expect((await get('/catalog-collections')).json().collections).toEqual([])
})

it('keeps betting distinct from explicit sexual content and exposes no unapproved collection',async()=>{
  const link=repo().addLink({id:'bet',tenantId,status:'PUBLISHED',nicheId:'niche-apostas',name:'private betting text'})
  const copy={title:'Comunidade de apostas esportivas',description:'Discussão de esportes e apostas para maiores de 18 anos.',explicit:false,approved:true}
  await editorial({links:{[link.id]:{...copy,fingerprint:linkFingerprint(link)}},collections:[{...copy,slug:'apostas-telegram',networkSlug:'telegram',nicheSlug:'apostas'},{...copy,slug:'draft',networkSlug:'telegram',nicheSlug:'apostas',approved:false}]})
  expect((await get('/links/bet')).json().seo.rating).toBeUndefined()
  expect((await get('/catalog-collections/apostas-telegram')).json().seo.rating).toBeUndefined()
  expect((await get('/catalog-collections/draft')).statusCode).toBe(404)
  expect((await get('/catalog-collections/unknown')).statusCode).toBe(404)
})

it('keeps a curated topic limited to its selected published links',async()=>{
  for(const id of ['selected','other'])repo().addLink({id,tenantId,status:'PUBLISHED',name:id})
  setCatalogLinksForTest(['selected','other'].map(id=>({id,name:id,description:'Ofertas',relevance:1,requiresAge:false,nicheSlug:'jogos',networkSlug:'telegram',homeActivatedAt:null,nicheActivatedAt:null})))
  await editorial({collections:[{slug:'ofertas-selecionadas',title:'Ofertas selecionadas',description:'Uma seleção editorial de ofertas.',explicit:false,approved:true,networkSlug:'telegram',nicheSlug:'jogos',linkIds:['selected']}]})
  const response=await get('/catalog-collections/ofertas-selecionadas')
  expect(response.statusCode).toBe(200)
  expect(response.json().organic.map((row:{id:string})=>row.id)).toEqual(['selected'])
  repo().links.find(row=>row.id==='selected')!.status='UNAVAILABLE'
  expect((await get('/catalog-collections')).json().collections).toEqual([])
  expect((await get('/catalog-collections/ofertas-selecionadas')).json().seo.robots).toBe('noindex,follow')
})

it('paginates all public previews on restricted facets without repeating the first page',async()=>{
  const links:SeoEditorial['links']={}
  for(let i=0;i<25;i++){
    const row=repo().addLink({id:'preview-'+i,tenantId,status:'PUBLISHED',nicheId:'niche-apostas',name:'original-secret-'+i})
    links[row.id]={title:'Prévia '+i,description:'Apresentação pública revisada.',explicit:false,approved:true,fingerprint:linkFingerprint(row)}
  }
  await editorial({links})
  const first=(await get('/niches/apostas?limit=24')).json()
  expect(first.previews).toHaveLength(24)
  expect(first.nextCursor).toEqual(expect.any(String))
  const second=(await get('/niches/apostas?cursor='+encodeURIComponent(first.nextCursor))).json()
  expect(second.previews).toHaveLength(1)
  expect(new Set([...first.previews,...second.previews].map((row:{id:string})=>row.id)).size).toBe(25)
  expect(second.nextCursor).toBeNull()
  expect((await get('/niches/apostas?cursor='+encodeURIComponent(first.nextCursor),'age=no')).statusCode).toBe(400)
})

it('propagates custom sexual classification to serving and rejects inconsistent preview approval',async()=>{
  repo().niches.push({...repo().niches[0]!,id:'custom',slug:'custom',name:'Comunidade customizada',requiresAge:true})
  const link=repo().addLink({id:'custom-preview',tenantId,status:'PUBLISHED',nicheId:'custom',name:'private'})
  const copy={title:'Apresentação pública',description:'Conteúdo para maiores de 18 anos.',explicit:false,approved:true}
  await editorial({facets:{'niche:custom':{...copy,explicit:true}},links:{[link.id]:{...copy,fingerprint:linkFingerprint(link)}}})
  expect((await get('/links/custom-preview')).json().seo.rating).toBe('adult')
  repo().addUser({id:'review-admin',tenantId,status:'ACTIVE',role:'ADMIN',identifiers:[]})
  const authorization='Bearer '+app.jwt.sign({sub:'review-admin',tenantId,role:'ADMIN',typ:'access'})
  const response=await app.inject({method:'PUT',url:'/api/v1/admin/catalog-seo/links/custom-preview',headers:{host,authorization},payload:{expectedVersion:1,...copy}})
  expect(response.statusCode).toBe(400)
})
