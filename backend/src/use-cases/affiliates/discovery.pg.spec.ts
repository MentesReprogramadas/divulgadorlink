import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { affiliateDayCandidates, affiliateDiscoveryState, configureAffiliateDiscovery, queueAffiliateDiscovery, queueAffiliateDiscoveryPage, findDiscoveryCandidate, runAffiliateDiscovery } from './discovery'
import {AffiliateCatalogError} from '@/domain/affiliates/mercado-livre'
import {evaluateAffiliateProduct} from '@/domain/affiliates/evaluation'

vi.mock('@/adapters/affiliates/openai-intelligence',()=>({expandAffiliateTerms:vi.fn(async(topic:string)=>[topic]),generateAffiliateTitle:vi.fn()}))
const url=process.env.AFFILIATE_DATABASE_URL
if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname) || !new URL(url).pathname.includes('regression')) throw new Error('Disposable regression AFFILIATE_DATABASE_URL required')
const db=new PrismaClient({datasourceUrl:url}),second=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),otherTenant=randomUUID(),actorId=randomUUID()
let segmentId:string
const result={products:[{id:'MLB100',catalogId:'MLB200',title:'Ração para gato',productUrl:'https://www.mercadolivre.com.br/p/MLB200?wid=MLB100',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}],checkedAt:new Date().toISOString(),comparison:'catalog_sellers' as const,warnings:[],counts:{catalogsFound:20,catalogsChecked:20,withoutOffers:19,failed:0}}
beforeAll(async()=>{
  await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'Discovery fixture'},{id:otherTenant,host:otherTenant+'.test',name:'Other discovery'}]})
  await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',passwordHash:'fixture'}})
})
beforeEach(async()=>{
  await db.affiliateSegment.deleteMany({where:{tenantId:{in:[tenantId,otherTenant]}}})
  await db.affiliatePriceObservation.deleteMany({where:{tenantId}})
  segmentId=(await db.affiliateSegment.create({data:{tenantId,name:'Natal',slug:'natal'}})).id
})
afterAll(async()=>{
  await db.affiliateSegment.deleteMany({where:{tenantId:{in:[tenantId,otherTenant]}}});await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect();await second.$disconnect()
})
const scope=()=>({tenantId,segmentId})
const run=(search:Parameters<typeof runAffiliateDiscovery>[1],client=db)=>runAffiliateDiscovery(client,search,undefined,scope())
describe('PostgreSQL discovery isolation and leases',()=>{
  it('qualifica termos antigos genéricos de Pets e barra brinquedos infantis na lista, no lote e na revisão',async()=>{
    await db.affiliateSegment.update({where:{id:segmentId},data:{name:'Pets'}})
    await db.affiliateDiscovery.create({data:{tenantId,segmentId,terms:['Brinquedo para cachorro'],expandedTerms:['brinquedo interativo']}})
    const make=(id:string,title:string)=>({...result.products[0],id,title})
    const search=vi.fn<NonNullable<Parameters<typeof runAffiliateDiscovery>[1]>>(async()=>({...result,products:[make('MLB100','Brinquedo para cachorro'),make('MLB200','Polvo Dançarino Luz Música Movimento para crianças')]}))
    await run(search)
    expect(search.mock.calls[0]?.[2]).toBe('brinquedo interativo para pets')
    expect((await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})).products.map(p=>p.id)).toEqual(['MLB100'])
    expect((await affiliateDayCandidates(db,tenantId,segmentId)).map(p=>p.id)).toEqual(['MLB100'])
    await expect(findDiscoveryCandidate(db,tenantId,segmentId,'MLB200')).rejects.toMatchObject({status:409})
  })
  it('o planejamento usa os termos atuais da lista e não recupera ofertas ocultas de uma configuração anterior',async()=>{
    await db.affiliateDiscovery.create({data:{tenantId,segmentId,terms:['Pets'],expandedTerms:['Pets']}})
    for(const [term,id] of [['Pets','MLB100'],['Natal','MLB200']]){
      const p={...result.products[0],id,catalogId:id,sourceTerm:term,sourcePage:1,evaluation:evaluateAffiliateProduct(result.products[0],[])}
      await db.affiliateDiscoveryPage.create({data:{tenantId,segmentId,term,page:1,productsJson:[p],countsJson:{},total:1}})
    }
    expect((await affiliateDayCandidates(db,tenantId,segmentId)).map(p=>p.id)).toEqual(['MLB100'])
  })
  it('retains failed-source cache with its original timestamp and retries the same page without recording stale prices',async()=>{
    const oldAt=new Date(Date.now()-86400000+60000).toISOString()
    await db.affiliateDiscovery.create({data:{tenantId,segmentId,expandedTerms:['Pets'],terms:['Pets'],pageCursors:{Pets:2}}})
    const shopee={...result.products[0],id:'SHP123_456',catalogId:'SHP123_456',productUrl:'https://shopee.com.br/product/123/456',checkedAt:oldAt,sourceTerm:'Pets',sourcePage:2,evaluation:evaluateAffiliateProduct(result.products[0],[])}
    await db.affiliateDiscoveryPage.create({data:{tenantId,segmentId,term:'Pets',page:2,productsJson:[shopee],countsJson:{},total:40}})
    const search=vi.fn(async()=>({...result,products:result.products.map(p=>({...p,checkedAt:new Date().toISOString()})),failedProviders:['SHOPEE' as const],warnings:['Shopee indisponível'],pagination:{offset:20,limit:40,total:200,hasNext:false}}))
    await run(search)
    const current=await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})
    expect(current.products.map(p=>p.id)).toEqual(['MLB100','SHP123_456'])
    expect(current.products[1].checkedAt).toBe(oldAt)
    expect(current.error).toBe('Shopee indisponível')
    expect(await db.affiliatePriceObservation.count({where:{tenantId,itemId:'SHP123_456'}})).toBe(0)
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).pageCursors).toEqual({Pets:2})
  })
  it('accepts legacy provider settings without clearing either source or historical decisions',async()=>{
    await configureAffiliateDiscovery(db,tenantId,actorId,segmentId,{enabled:true,terms:['Pets']})
    const both={...result,products:[...result.products,{...result.products[0],id:'SHP123_456',catalogId:'SHP123_456',productUrl:'https://shopee.com.br/product/123/456'}]}
    const search=vi.fn(async()=>({...both,products:both.products.map(p=>({...p,checkedAt:new Date().toISOString()}))}))
    await run(search)
    await db.affiliateProductDecision.create({data:{tenantId,segmentId,itemId:'MLB100',decision:'DISCARDED',reason:'Manual',actorId}})
    const configured=await configureAffiliateDiscovery(db,tenantId,actorId,segmentId,{enabled:true,terms:['Pets'],provider:'SHOPEE'})
    expect(configured.providers).toEqual(['MERCADO_LIVRE','SHOPEE'])
    expect(await db.affiliateDiscoveryPage.count({where:{tenantId,segmentId}})).toBe(1)
    expect(await db.affiliateProductDecision.count({where:{tenantId,segmentId}})).toBe(1)
    expect((await affiliateDiscoveryState(db,tenantId,segmentId,{view:'ALL',mode:'MIXED'})).products.map(p=>p.id)).toEqual(['SHP123_456'])
    await run(search)
    expect(search).toHaveBeenLastCalledWith(db,tenantId,'Pets',{offset:0})
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).provider).toBe('MERCADO_LIVRE')
  })
  it('restores v1 automatic discards from stored pages while preserving manual decisions',async()=>{
    const item={...result.products[0],reputation:{level:'2_orange',status:'POOR' as const}}
    await run(vi.fn(async()=>({...result,products:[item]})))
    const legacy={...item,sourceTerm:'Natal',sourcePage:1,evaluation:{...evaluateAffiliateProduct(item,[]),rulesVersion:'v1',status:'DISCARDED'}}
    await db.affiliateDiscoveryPage.updateMany({where:{tenantId,segmentId},data:{productsJson:[legacy]}})
    expect(await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})).toMatchObject({products:[{id:'MLB100',evaluation:{status:'REVIEW',rulesVersion:'v2'}}],statusCounts:{DISCARDED:0}})
    await db.affiliateProductDecision.create({data:{tenantId,segmentId,itemId:'MLB100',decision:'DISCARDED',reason:'Não quero divulgar',actorId}})
    expect((await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})).products).toHaveLength(0)
    expect((await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'DISCARDED'})).products[0]).toMatchObject({decision:'DISCARDED'})
  })
  it('warms every expanded term before rotating to each term next page',async()=>{
    await db.affiliateDiscovery.create({data:{tenantId,segmentId,expandedTerms:['Natal','Presentes']}})
    const search=vi.fn<NonNullable<Parameters<typeof runAffiliateDiscovery>[1]>>(async()=>({...result,counts:{...result.counts,catalogsFound:200}}))
    await run(search)
    expect(await affiliateDiscoveryState(db,tenantId,segmentId)).toMatchObject({cycleIntervalMs:30000,status:'QUEUED'})
    expect(await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).toMatchObject({cursor:1,pageCursors:{Natal:2}})
    for(let index=0;index<3;index++){
      await db.affiliateDiscovery.update({where:{segmentId},data:{nextRunAt:new Date(0)}})
      await run(search)
    }
    expect(search.mock.calls.map(call=>[call[2],call[3]?.offset])).toEqual([['Natal',0],['Presentes',0],['Natal',20],['Presentes',20]])
    expect(await affiliateDiscoveryState(db,tenantId,segmentId)).toMatchObject({cycleIntervalMs:900000})
    expect(await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).toMatchObject({cursor:0,pageCursors:{Natal:3,Presentes:3}})
    await queueAffiliateDiscoveryPage(db,tenantId,actorId,segmentId,{term:'Natal',page:6})
    await db.affiliateDiscovery.update({where:{segmentId},data:{nextRunAt:new Date(0)}})
    await run(search)
    expect(search.mock.calls.at(-1)?.slice(2)).toEqual(['Natal',{offset:100}])
    expect(await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).toMatchObject({cursor:0,pageCursors:{Natal:3,Presentes:3}})
  })
  it('keeps fresh matching pages when terms change and prunes expired cache',async()=>{
    await run(vi.fn(async()=>result))
    const now=new Date(),stale=new Date(now.getTime()-2*86400000)
    await db.affiliateDiscoveryPage.createMany({data:[
      {tenantId,segmentId,term:'Outra campanha',page:1,total:1,countsJson:{},productsJson:[{...result.products[0],id:'MLB999',sourceTerm:'Outra campanha'}],checkedAt:now},
      {tenantId,segmentId,term:'Expirado',page:1,total:0,countsJson:{},productsJson:[],checkedAt:stale},
    ]})
    const terms=['Natal','Led Natal','Luz Nata','Kit Decoração Natal','Kit Enfeites Natal']
    await configureAffiliateDiscovery(db,tenantId,actorId,segmentId,{enabled:true,terms})
    expect(await db.affiliateDiscoveryPage.count({where:{tenantId,segmentId}})).toBe(2)
    const state=await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})
    expect(state.terms).toEqual(terms)
    expect(state.products.map(p=>p.id)).toEqual(['MLB100'])
    expect(state.status).toBe('QUEUED')
  })
  it('keeps provider total honest and closes navigation at the actual refused page',async()=>{
    await db.affiliateDiscovery.create({data:{tenantId,segmentId,expandedTerms:['Natal'],pageCursors:{Natal:6},cursor:0}})
    await run(vi.fn(async()=>({...result,counts:{...result.counts,catalogsFound:10000}})))
    await db.affiliateDiscovery.update({where:{segmentId},data:{nextRunAt:new Date(0)}})
    const failure=vi.fn(async()=>{throw new AffiliateCatalogError(400,'Provider boundary')})
    await run(failure)
    expect(failure).toHaveBeenCalledWith(db,tenantId,'Natal',{offset:120})
    expect(await affiliateDiscoveryState(db,tenantId,segmentId,{term:'Natal',page:6,view:'ALL'})).toMatchObject({status:'ERROR',products:[{id:'MLB100'}],pagination:{total:10000,hasNext:false,providerBoundaryReached:true}})
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).cursor).toBe(0)
  })
  it('uses real preceding days for median evidence without fabricating an old price',async()=>{
    const day=new Date(new Date().toISOString().slice(0,10))
    await db.affiliatePriceObservation.createMany({data:[1,2,3].map(delta=>({tenantId,itemId:'MLB100',day:new Date(day.getTime()-delta*86400000),priceCents:1200}))})
    const search=vi.fn(async()=>({...result,products:result.products.map(product=>({...product,reputation:{level:'5_green',status:'GREEN' as const}}))}))
    await run(search)
    const state=await affiliateDiscoveryState(db,tenantId,segmentId)
    expect(state.products[0]).toMatchObject({oldPriceCents:null,evaluation:{status:'SELECTED',reportedDiscountPercent:null,history:{days:3,medianPriceCents:1200,verified:true}}})
  })
  it('overlays persistent decisions, blocks preview and never treats duplicate same-day observations as history',async()=>{
    await run(vi.fn(async()=>result))
    const first=await affiliateDiscoveryState(db,tenantId,segmentId)
    expect(first.products[0].evaluation).toMatchObject({status:'REVIEW',history:{days:0,verified:false}})
    await db.affiliateProductDecision.create({data:{tenantId,segmentId,itemId:'MLB100',decision:'DISCARDED',reason:'Revisado pelo operador',actorId}})
    expect((await affiliateDiscoveryState(db,tenantId,segmentId)).products[0]).toMatchObject({decision:'DISCARDED',evaluation:{status:'DISCARDED'}})
    await expect(findDiscoveryCandidate(db,tenantId,segmentId,'MLB100')).rejects.toMatchObject({status:409})
    await expect(db.affiliateProductDecision.create({data:{tenantId:otherTenant,segmentId,itemId:'MLB101',decision:'SENT',reason:'foreign'}})).rejects.toMatchObject({code:'P2003'})
  })
  it('queues a requested page during an active lease without stealing ownership or losing intent',async()=>{
    await db.affiliateDiscovery.create({data:{tenantId,segmentId,expandedTerms:['Natal'],checkedAt:new Date(0)}})
    let finish!:(value:typeof result)=>void
    const pending=run(vi.fn(()=>new Promise<typeof result>(resolve=>{finish=resolve})))
    await vi.waitFor(async()=>expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).status).toBe('RUNNING'))
    const old=await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})
    await queueAffiliateDiscoveryPage(second,tenantId,actorId,segmentId,{term:'Natal',page:4})
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).leaseToken).toBe(old.leaseToken)
    finish(result);await pending
    const queued=await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})
    expect(queued).toMatchObject({requestedTerm:'Natal',requestedPage:4,leaseToken:null})
    expect(queued.nextRunAt.getTime()).toBeGreaterThan(Date.now()+25_000)
    await db.affiliateDiscovery.update({where:{segmentId},data:{nextRunAt:new Date(0)}})
    const search=vi.fn(async()=>result)
    await run(search)
    expect(search).toHaveBeenCalledWith(db,tenantId,'Natal',{offset:60})
    expect(await affiliateDiscoveryState(db,tenantId,segmentId,{term:'Natal',page:4,view:'ALL'})).toMatchObject({pagination:{page:4},products:[{sourcePage:4}]})
  })
  it('GET is read only; composite FK and tenant checks block foreign segments',async()=>{
    expect(await affiliateDiscoveryState(db,tenantId,segmentId)).toMatchObject({status:'QUEUED',terms:['Natal']})
    expect(await db.affiliateDiscovery.count({where:{segmentId}})).toBe(0)
    await expect(affiliateDiscoveryState(db,otherTenant,segmentId)).rejects.toMatchObject({status:404})
    await expect(db.affiliateDiscovery.create({data:{segmentId,tenantId:otherTenant}})).rejects.toMatchObject({code:'P2003'})
  })
  it('creates defaults and stores cache without changing group provisioning updatedAt',async()=>{
    const before=await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})
    const search=vi.fn(async()=>result)
    expect(await run(search)).toBe(1)
    expect(search).toHaveBeenCalledWith(db,tenantId,'Natal',{offset:0})
    expect(await affiliateDiscoveryState(db,tenantId,segmentId)).toMatchObject({status:'QUEUED',products:[{id:'MLB100'}],counts:{...result.counts,catalogsChecked:20,withoutOffers:19}})
    expect((await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).updatedAt).toEqual(before.updatedAt)
  })
  it('persists real observations once per day and page evidence',async()=>{
    await run(vi.fn(async()=>result))
    expect(await db.affiliatePriceObservation.count({where:{tenantId,itemId:'MLB100'}})).toBe(1)
    expect(await db.affiliateDiscoveryPage.count({where:{tenantId,segmentId}})).toBe(1)
    await db.affiliateDiscovery.update({where:{segmentId},data:{nextRunAt:new Date(0)}})
    await run(vi.fn(async()=>result))
    expect(await db.affiliatePriceObservation.count({where:{tenantId,itemId:'MLB100'}})).toBe(1)
  })
  it('refresh keeps active lease and cursor/version while competing process cannot collect',async()=>{
    await configureAffiliateDiscovery(db,tenantId,actorId,segmentId,{enabled:true,terms:[]})
    let finish!:(value:typeof result)=>void
    const search=vi.fn(async()=>result).mockImplementationOnce(()=>new Promise<typeof result>(resolve=>{finish=resolve}))
    const pending=run(search)
    await vi.waitFor(()=>expect(search).toHaveBeenCalledOnce())
    const old=await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})
    expect(await queueAffiliateDiscovery(second,tenantId,actorId,segmentId)).toMatchObject({status:'RUNNING'})
    const current=await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})
    expect(current.leaseToken).toBe(old.leaseToken);expect(current.configVersion).toBe(old.configVersion)
    const otherSearch=vi.fn(async()=>result);expect(await run(otherSearch,second)).toBe(0);expect(otherSearch).not.toHaveBeenCalled()
    finish(result);await pending
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).status).toBe('QUEUED')
  })
  it('config changes discard in-flight data and preserve paused state',async()=>{
    let finish!:(value:typeof result)=>void
    const search=vi.fn(async()=>result).mockImplementationOnce(()=>new Promise<typeof result>(resolve=>{finish=resolve}))
    const pending=run(search);await vi.waitFor(()=>expect(search).toHaveBeenCalledOnce())
    await configureAffiliateDiscovery(second,tenantId,actorId,segmentId,{enabled:false,terms:['Presentes']})
    finish(result);await pending
    expect(await affiliateDiscoveryState(db,tenantId,segmentId)).toMatchObject({enabled:false,status:'PAUSED',terms:['Presentes'],products:[]})
    expect(search).toHaveBeenCalledOnce()
    await expect(queueAffiliateDiscovery(db,tenantId,actorId,segmentId)).rejects.toMatchObject({status:409})
  })
  it('segment pause discards an in-flight result',async()=>{
    let finish!:(value:typeof result)=>void
    const search=vi.fn(async()=>result).mockImplementationOnce(()=>new Promise<typeof result>(resolve=>{finish=resolve}))
    const pending=run(search);await vi.waitFor(()=>expect(search).toHaveBeenCalledOnce())
    await db.affiliateSegment.update({where:{id:segmentId},data:{enabled:false}})
    finish(result);await pending
    expect(await affiliateDiscoveryState(db,tenantId,segmentId)).toMatchObject({status:'PAUSED',products:[]})
  })
  it('scoped HTTP kick selects only requested segment and cooldown prevents repeated refresh',async()=>{
    const other=await db.affiliateSegment.create({data:{tenantId:otherTenant,name:'Outro tema',slug:'outro'}})
    await db.affiliateDiscovery.create({data:{segmentId:other.id,tenantId:otherTenant,nextRunAt:new Date(0)}})
    await run(vi.fn(async()=>result))
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId:other.id}})).status).toBe('QUEUED')
    const previous=await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})
    expect(await queueAffiliateDiscovery(db,tenantId,actorId,segmentId)).toMatchObject({status:'QUEUED'})
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).nextRunAt).toEqual(previous.nextRunAt)
    const search=vi.fn(async()=>result);expect(await run(search)).toBe(0);expect(search).not.toHaveBeenCalled()
  })
  it('expired worker lease recovers and rotates to next page',async()=>{
    await db.affiliateDiscovery.create({data:{segmentId,tenantId,status:'RUNNING',leaseToken:'old-worker',leaseExpiresAt:new Date(0),cursor:0,pageCursors:{Natal:2}}})
    const search=vi.fn(async()=>result);await run(search)
    expect(search).toHaveBeenCalledWith(db,tenantId,'Natal',{offset:20})
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).status).toBe('QUEUED')
    await db.affiliateDiscovery.update({where:{segmentId},data:{nextRunAt:new Date(0)}})
    await run(search)
    expect(search).toHaveBeenLastCalledWith(db,tenantId,'Camiseta masculina',{offset:0})
    expect((await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId}})).status).toBe('QUEUED')
  })
})
