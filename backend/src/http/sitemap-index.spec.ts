import {beforeEach,expect,it} from 'vitest'
import {entriesFrom} from '@/http/sitemap-index'
import {readSeoInventory} from '@/http/catalog-seo-inventory'
import {getLinksRepository,InMemoryLinksRepository,resetLinksRepositoryForTest} from '@/repositories/links-repository'
import {resetConfigsRepositoryForTest} from '@/repositories/configs-repository'
const tenantId='seed-temlinkaqui'
beforeEach(()=>{resetLinksRepositoryForTest();resetConfigsRepositoryForTest()})
function repo(){const value=getLinksRepository();if(!(value instanceof InMemoryLinksRepository))throw Error('Expected memory');return value}
it('uses a real eligible modification date and omits it when empty',async()=>{
 const updatedAt=new Date('2026-10-06T00:00:00.000Z')
 repo().addLink({id:'public',tenantId,status:'PUBLISHED',updatedAt})
 expect(entriesFrom(await readSeoInventory(tenantId))[0]).toEqual({path:'/',updatedAt:updatedAt.toISOString()})
 repo().links=[]
 expect(entriesFrom(await readSeoInventory(tenantId))[0]).toEqual({path:'/',updatedAt:''})
})
it('excludes empty facets, unapproved restricted previews and private networks',async()=>{
 repo().addLink({id:'restricted',tenantId,status:'PUBLISHED',nicheId:'niche-apostas'})
 repo().addLink({id:'private',tenantId,status:'PUBLISHED',networkId:'net-outro'})
 expect(entriesFrom(await readSeoInventory(tenantId)).map(row=>row.path)).toEqual(['/','/divulgar','/privacidade','/termos'])
})
