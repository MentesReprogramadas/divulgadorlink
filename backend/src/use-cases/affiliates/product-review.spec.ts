import type { PrismaClient } from '@prisma/client'
import { afterEach, expect, it, vi } from 'vitest'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
import { previewAffiliateProduct, readAffiliateProductPreview, regenerateAffiliateProductTitle } from './product-review'

afterEach(()=>vi.restoreAllMocks())
async function fixture() {
  const product={id:'MLB123456',catalogId:'MLB123',title:'Árvore de Natal verde',productUrl:'https://www.mercadolivre.com.br/p/MLB123?wid=MLB123456',priceCents:2590,oldPriceCents:3990,imageUrl:'https://http2.mlstatic.com/fixture.jpg',checkedAt:new Date().toISOString()}
  const candidate={...product,evaluation:evaluateAffiliateProduct(product,[]),sourceTerm:'Natal',sourcePage:1}
  const segment={id:'segment',name:'Natal',updatedAt:new Date()}
  const mocks={affiliateSegment:{findFirst:vi.fn(async()=>segment)},affiliateConnection:{findUnique:vi.fn(async():Promise<{id:string;credentials:string;status:string}|null>=>null)},affiliateGroup:{findMany:vi.fn(async()=>[{id:'group',name:'Natal #1'}])},affiliateProductDecision:{findUnique:vi.fn(async():Promise<{decision:string}|null>=>null)}}
  const db=mocks as unknown as PrismaClient
  const ports={candidate:vi.fn(async()=>candidate),refresh:vi.fn(async()=>candidate),link:vi.fn(async()=>({url:'https://meli.la/fixture',fullUrl:'https://www.mercadolivre.com.br/social/test',tag:'test',profile:'test'})),title:vi.fn(async()=>({title:product.title,source:'OPENAI' as 'OPENAI'|'ORIGINAL'}))}
  const preview=await previewAffiliateProduct(db,'tenant','actor','segment',product.id,ports)
  for(const mock of Object.values(ports))mock.mockClear()
  return {db,mocks,ports,preview,candidate}
}

it('regenerates the signed title/message/id without refreshing price/link or extending expiry',async()=>{
  const {db,ports,preview,candidate}=await fixture()
  ports.title.mockResolvedValue({title:'Árvore verde de Natal',source:'OPENAI'})
  const result=await regenerateAffiliateProductTitle(db,'tenant','actor','segment',preview.previewToken,ports)
  const old=readAffiliateProductPreview(preview.previewToken,'tenant','actor','segment'),next=readAffiliateProductPreview(result.previewToken,'tenant','actor','segment')
  expect(next).toEqual({...old,id:next.id,title:result.title,message:result.message})
  expect(next.id).not.toBe(old.id);expect(result.expiresAt).toBe(preview.expiresAt)
  expect(result.message).toContain(result.title);expect(result.message).toContain(preview.affiliateUrl)
  expect(ports.title).toHaveBeenCalledWith(db,'tenant',candidate,undefined,preview.title)
  expect(ports.refresh).not.toHaveBeenCalled();expect(ports.link).not.toHaveBeenCalled()
})

it('rejects tampering and other scopes before consulting the candidate or AI',async()=>{
  const {db,ports,preview}=await fixture()
  for(const [tenant,actor,segment,token] of [['other','actor','segment',preview.previewToken],['tenant','other','segment',preview.previewToken],['tenant','actor','other',preview.previewToken],['tenant','actor','segment',preview.previewToken+'x']]) {
    await expect(regenerateAffiliateProductTitle(db,tenant,actor,segment,token,ports)).rejects.toHaveProperty('status')
  }
  expect(ports.candidate).not.toHaveBeenCalled();expect(ports.title).not.toHaveBeenCalled()
})

it('refuses expired, changed, discarded or sent previews and IA fallback',async()=>{
  const {db,mocks,ports,preview}=await fixture()
  const regenerate=()=>regenerateAffiliateProductTitle(db,'tenant','actor','segment',preview.previewToken,ports)
  const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now()+600_000)
  await expect(regenerate()).rejects.toMatchObject({status:409});clock.mockRestore()
  mocks.affiliateGroup.findMany.mockResolvedValueOnce([])
  await expect(regenerate()).rejects.toMatchObject({status:409})
  mocks.affiliateConnection.findUnique.mockResolvedValueOnce({id:'changed',credentials:'fixture',status:'DISCONNECTED'})
  await expect(regenerate()).rejects.toMatchObject({status:409})
  for(const decision of ['SENT','DISCARDED']){
    mocks.affiliateProductDecision.findUnique.mockResolvedValueOnce({decision})
    await expect(regenerate()).rejects.toMatchObject({status:409})
  }
  expect(ports.title).not.toHaveBeenCalled()
  ports.title.mockResolvedValue({title:preview.title,source:'ORIGINAL'})
  await expect(regenerate()).rejects.toMatchObject({status:503,message:expect.stringContaining('prévia anterior foi mantida')})
})

it('rechecks destination changes after AI completes',async()=>{
  const {db,mocks,ports,preview}=await fixture()
  ports.title.mockImplementation(async()=>{
    mocks.affiliateGroup.findMany.mockResolvedValueOnce([])
    return {title:'Árvore verde de Natal',source:'OPENAI'}
  })
  await expect(regenerateAffiliateProductTitle(db,'tenant','actor','segment',preview.previewToken,ports)).rejects.toMatchObject({status:409})
})
