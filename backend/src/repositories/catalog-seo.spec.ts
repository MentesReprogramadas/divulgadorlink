import { beforeEach, describe, expect, it } from 'vitest'
import { readCatalogSeo, writeCatalogSeo, CatalogSeoConflictError } from './catalog-seo'
import { resetConfigsRepositoryForTest } from './configs-repository'
import { getAuditLogsRepository, InMemoryAuditLogsRepository, resetAuditLogsRepositoryForTest } from './audit-logs-repository'

beforeEach(()=>{resetConfigsRepositoryForTest();resetAuditLogsRepositoryForTest()})
describe('persistência editorial SEO',()=>{
  it('isola tenant, preserva revisão e grava somente uma edição concorrente',async()=>{
    expect(await readCatalogSeo('t')).toEqual({version:0,facets:{},links:{},collections:[]})
    const state=await readCatalogSeo('t')
    const results=await Promise.allSettled([writeCatalogSeo('t',0,{...state,facets:{'niche:apostas':{title:'Apostas',description:'Grupos de apostas esportivas.',explicit:false,approved:true}}},'admin','r1'),writeCatalogSeo('t',0,state,'admin','r2')])
    expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1)
    const rejected=results.find(x=>x.status==='rejected')
    expect(rejected?.status==='rejected'&&rejected.reason).toBeInstanceOf(CatalogSeoConflictError)
    expect((await readCatalogSeo('t')).version).toBe(1)
    expect((await readCatalogSeo('other')).version).toBe(0)
    expect((getAuditLogsRepository() as InMemoryAuditLogsRepository).items).toHaveLength(1)
  })
})
