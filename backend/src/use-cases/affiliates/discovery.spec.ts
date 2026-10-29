import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { affiliateDiscoveryState, discoveryConfigSchema, mergeDiscoveryProducts, runAffiliateDiscovery } from './discovery'
vi.mock('@/adapters/affiliates/openai-intelligence',()=>({expandAffiliateTerms:vi.fn(async(topic:string)=>[topic]),generateAffiliateTitle:vi.fn()}))
import { AffiliateCatalogError, type CatalogProduct } from '@/domain/affiliates/mercado-livre'

const now = new Date()
const product = (id='MLB1',checkedAt=now.toISOString()):CatalogProduct=>({id,catalogId:'MLB20',title:'Presente',productUrl:'https://www.mercadolivre.com.br/p/MLB20?wid=MLB1',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt})
const row = {segmentId:'segment',tenantId:'tenant',enabled:true,terms:['Natal','Presentes'],expandedTerms:['Natal','Presentes'],requestedTerm:null,requestedPage:null,pageCursors:{Natal:2,Presentes:2},cursor:3,configVersion:2,productsJson:[],checkedAt:now,nextRunAt:now,segment:{name:'Natal',updatedAt:now}}
const fixture = () => {
  const mocks = {segments:vi.fn(async()=>[]),find:vi.fn(async()=>row),update:vi.fn<(input:unknown)=>Promise<{count:number}>>(async()=>({count:1})),create:vi.fn(),segment:vi.fn(async()=>({name:'Natal',enabled:true}))}
  const db = {affiliateSegment:{findMany:mocks.segments,findFirst:mocks.segment},affiliatePriceObservation:{findMany:vi.fn(async()=>[]),upsert:vi.fn()},affiliateDiscoveryPage:{findUnique:vi.fn(async()=>null),findMany:vi.fn(async()=>[{term:'Natal'},{term:'Presentes'}]),upsert:vi.fn()},affiliateProductDecision:{findMany:vi.fn(async()=>[])},affiliateDiscovery:{findFirst:mocks.find,findUniqueOrThrow:mocks.find,updateMany:mocks.update,createMany:mocks.create}} as unknown as PrismaClient
  Object.assign(db,{$transaction:async(work:(tx:PrismaClient)=>Promise<unknown>)=>work(db)})
  return {mocks,db}
}
const result = {products:[product()],checkedAt:now.toISOString(),comparison:'catalog_sellers' as const,warnings:[],counts:{catalogsFound:200,catalogsChecked:20,withoutOffers:19,failed:0}}
beforeEach(()=>vi.clearAllMocks())
describe('descoberta automática',()=>{
  it('mostra todos os anúncios válidos sem contar ausência de anúncio como descarte nem reoferecer enviados',async()=>{
    const {db}=fixture()
    const evaluated=(id:string,status:string)=>({...product(id),catalogId:`catalog-${id}`,sourceTerm:'Natal',sourcePage:1,evaluation:{status,reasons:[]}})
    vi.mocked(db.affiliateDiscoveryPage.findMany).mockResolvedValue([{term:'Natal',page:1,checkedAt:now,productsJson:[evaluated('selected','SELECTED'),evaluated('review','REVIEW'),evaluated('poor','DISCARDED'),evaluated('sent','SELECTED'),evaluated('manual','SELECTED')],countsJson:{rejected:[{id:'absent',title:'Sem anúncios',reason:'Sem anúncios atuais',kind:'NO_LISTINGS'},{id:'failed',title:'Consulta falhou',reason:'Não avaliado',kind:'LOOKUP_FAILED'},{id:'catalog-selected',title:'Antigo indisponível',reason:'Não avaliado',kind:'NO_LISTINGS'}]}}] as never)
    vi.mocked(db.affiliateProductDecision.findMany).mockResolvedValue([{itemId:'sent',decision:'SENT'},{itemId:'manual',decision:'DISCARDED',reason:'Não interessa'}] as never)
    const available=await affiliateDiscoveryState(db,'tenant','segment',{mode:'MIXED',view:'ALL'})
    expect(available.products.map(p=>p.id)).toEqual(['selected','review'])
    expect(available.pagination.total).toBe(2)
    expect(available.statusCounts).toEqual({SELECTED:1,REVIEW:1,DISCARDED:2})
    expect(available.collectionSummary).toEqual({available:2,unavailable:2,failed:1})
    expect(available.rejected).toEqual([])
    expect(available.unavailable.map(p=>p.id)).toEqual(['absent','failed'])
    const discarded=await affiliateDiscoveryState(db,'tenant','segment',{mode:'MIXED',view:'DISCARDED'})
    expect(discarded.products.map(p=>p.id)).toEqual(['poor','manual'])
  })
  it('reúne termos e páginas, intercala produtos, deduplica pela cotação mais nova e pagina após avaliação',async()=>{
    const {db}=fixture()
    const evaluated=(id:string,term:string,priceCents=1000)=>({...product(id),sourceTerm:term,sourcePage:1,priceCents,evaluation:{status:'SELECTED',reasons:[]}})
    const first=Array.from({length:21},(_,i)=>evaluated(`MLB${i+1}`,'Natal'))
    vi.mocked(db.affiliateDiscoveryPage.findMany).mockResolvedValue([
      {term:'Presentes',page:1,productsJson:[evaluated('MLB99','Presentes'),evaluated('MLB1','Presentes',900)],countsJson:{},checkedAt:now},
      {term:'Natal',page:1,productsJson:first,countsJson:{},checkedAt:new Date(now.getTime()-1000)},
    ] as never)
    const mixed=await affiliateDiscoveryState(db,'tenant','segment',{mode:'MIXED',view:'SELECTED'})
    expect(mixed.products.slice(0,4).map(p=>p.id)).toEqual(['MLB2','MLB99','MLB3','MLB1'])
    expect(mixed.products.find(p=>p.id==='MLB1')?.priceCents).toBe(900)
    expect(mixed.products).toHaveLength(20)
    expect(mixed.pagination).toMatchObject({mode:'MIXED',total:22,hasNext:true,page:1})
    expect(db.affiliateDiscoveryPage.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({tenantId:'tenant',segmentId:'segment',term:{in:['Natal','Presentes']}})}))
    const second=await affiliateDiscoveryState(db,'tenant','segment',{mode:'MIXED',view:'SELECTED',page:2})
    expect(second.products).toHaveLength(2)
    expect(second.pagination).toMatchObject({page:2,hasPrevious:true,hasNext:false})
    expect(new Set([...mixed.products,...second.products].map(p=>p.id)).size).toBe(22)
    vi.mocked(db.affiliateProductDecision.findMany).mockResolvedValue([{itemId:'MLB99',decision:'DISCARDED',reason:'Não interessa'}] as never)
    const discarded=await affiliateDiscoveryState(db,'tenant','segment',{mode:'MIXED',view:'DISCARDED',page:4})
    expect(discarded.products.map(p=>p.id)).toEqual(['MLB99'])
    expect(discarded.pagination).toMatchObject({page:1,total:1})
    expect(discarded.statusCounts).toEqual({SELECTED:21,REVIEW:0,DISCARDED:1})
  })
  it('persists expanded terms before provider failure without losing explicitly configured seeds',async()=>{
    const {mocks,db}=fixture();mocks.find.mockResolvedValue({...row,expandedTerms:[],cursor:0} as never)
    await runAffiliateDiscovery(db,vi.fn(async()=>{throw new AffiliateCatalogError(403,'Denied')}))
    expect(mocks.update.mock.calls[1][0]).toMatchObject({data:{expandedTerms:['Natal','Presentes']}})
    expect(mocks.update.mock.calls[2][0]).toMatchObject({data:{status:'ERROR',error:'Denied'}})
  })
  it('valida termos limitados e rejeita campos inesperados',()=>{
    expect(discoveryConfigSchema.parse({enabled:true,terms:[]})).toEqual({enabled:true,terms:[]})
    for(const patch of [{terms:['x']},{terms:Array(6).fill('Natal')},{terms:['x'.repeat(121)]},{tenantId:'other'}]) expect(discoveryConfigSchema.safeParse({enabled:true,terms:[],...patch}).success).toBe(false)
  })
  it('deduplica por anúncio, atualiza preço, expira 24h e limita 100 sem apagar ausentes válidos',()=>{
    const old = [product('MLB1'),product('MLB2'),product('expired',new Date(now.getTime()-86400001).toISOString())]
    expect(mergeDiscoveryProducts(old,[{...product(),priceCents:2000}],now)).toEqual([expect.objectContaining({id:'MLB1',priceCents:2000}),expect.objectContaining({id:'MLB2'})])
    expect(mergeDiscoveryProducts([],Array.from({length:110},(_,index)=>product(`MLB${index}`)),now)).toHaveLength(100)
  })
  it('GET ausente permanece somente leitura e respeita tenant',async()=>{
    const {mocks,db}=fixture();mocks.find.mockResolvedValue(null as never)
    expect(await affiliateDiscoveryState(db,'tenant','segment')).toMatchObject({enabled:true,usesSegmentName:true,terms:['Natal'],products:[],status:'QUEUED'})
    expect(mocks.find).toHaveBeenCalledWith({where:{segmentId:'segment',tenantId:'tenant'}})
    expect(mocks.create).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled()
  })
  it('identifica termos explícitos para preservar o padrão ao pausar e retomar',async()=>{
    const {db}=fixture()
    expect(await affiliateDiscoveryState(db,'tenant','segment')).toMatchObject({usesSegmentName:false,terms:['Natal','Presentes']})
  })
  it('rotaciona termos e páginas com lease e CAS de configuração/segmentação',async()=>{
    const {mocks,db}=fixture(),search=vi.fn(async()=>result)
    expect(await runAffiliateDiscovery(db,search)).toBe(1)
    expect(search).toHaveBeenCalledWith(db,'tenant','Presentes',{offset:20})
    expect(mocks.update.mock.calls[0][0]).toMatchObject({where:{enabled:true,tenantId:'tenant',segmentId:'segment',configVersion:2,segment:{enabled:true,updatedAt:now}},data:{status:'RUNNING',leaseToken:expect.any(String)}})
    expect(mocks.update.mock.calls[1][0]).toMatchObject({where:{configVersion:2,leaseToken:expect.any(String),segment:{enabled:true,updatedAt:now}},data:{status:'READY',cursor:0,pageCursors:{Natal:2,Presentes:3}}})
  })
  it('advances past third page without a fixed modulo',async()=>{
    const {mocks,db}=fixture();mocks.find.mockResolvedValue({...row,expandedTerms:['Natal'],terms:[],pageCursors:{Natal:4},cursor:0,checkedAt:null} as never)
    const search=vi.fn(async()=>result)
    await runAffiliateDiscovery(db,search)
    expect(search).toHaveBeenCalledWith(db,'tenant','Natal',{offset:60})
    expect(mocks.update.mock.calls[1][0]).toMatchObject({data:{status:'READY',cursor:0,pageCursors:{Natal:5},leaseToken:null}})
  })
  it('não consulta catálogo quando outro processo ganhou o lease',async()=>{
    const {mocks,db}=fixture(),search=vi.fn(async()=>result);mocks.update.mockResolvedValue({count:0})
    expect(await runAffiliateDiscovery(db,search)).toBe(0);expect(search).not.toHaveBeenCalled()
  })
  it('não inicia outro coletor simultâneo no processo',async()=>{
    const {db}=fixture();let finish!:(value:typeof result)=>void
    const search=vi.fn(()=>new Promise<typeof result>(resolve=>{finish=resolve}))
    const first=runAffiliateDiscovery(db,search)
    await vi.waitFor(()=>expect(search).toHaveBeenCalledOnce())
    expect(await runAffiliateDiscovery(db,search)).toBe(0)
    finish(result);await first
  })
  it('preserva cache em falhas e agenda retentativa sem registrar credenciais',async()=>{
    const {mocks,db}=fixture(),search=vi.fn(async()=>{throw new AffiliateCatalogError(403,'Consulta não permitida.')})
    await runAffiliateDiscovery(db,search)
    const saved=mocks.update.mock.calls[1][0] as unknown as {data:Record<string,unknown>}
    expect(saved.data).toMatchObject({status:'ERROR',error:'Consulta não permitida.',leaseToken:null})
    expect(saved.data).not.toHaveProperty('productsJson')
    expect((saved.data.nextRunAt as Date).getTime()).toBeGreaterThan(Date.now()+14*60000)
  })
})
