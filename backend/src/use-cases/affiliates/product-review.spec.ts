import type { PrismaClient } from '@prisma/client'
import { createHmac } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
import { offerMessage } from '@/domain/affiliates/contracts'
import { env } from '@/env'
import type { AffiliateCopy } from '@/adapters/affiliates/openai-intelligence'
import { previewAffiliateProduct, readAffiliateProductPreview, regenerateAffiliateProductTitle, sendAffiliateProduct } from './product-review'

afterEach(()=>vi.restoreAllMocks())
it('signs a Shopee preview against its own tenant connection and accepts the namespaced identity', async () => {
  const product = { id: 'SHP123_456', catalogId: 'SHP123_456', title: 'Brinquedo para gatos', productUrl: 'https://shopee.com.br/product/123/456', priceCents: 2130, oldPriceCents: 3492, oldPriceEstimated:true, reportedDiscountPercent:39, imageUrl: 'https://down-br.img.susercontent.com/file/test', checkedAt: new Date().toISOString() }
  const candidate = { ...product, evaluation: evaluateAffiliateProduct(product, []), sourceTerm: 'gatos', sourcePage: 1 }
  const read = vi.fn(async () => ({ id: 'shopee-account', credentials: 'encrypted-test', status: 'CONNECTED' }))
  const db = { affiliateSegment: { findFirst: vi.fn(async () => ({ id: 'segment', name: 'Pets', updatedAt: new Date('2026-10-29') })) }, affiliateConnection: { findUnique: read }, affiliateGroup: { findMany: vi.fn(async () => []) },affiliateProductDecision:{findUnique:vi.fn(async()=>null)} } as unknown as PrismaClient
  const ports = { candidate: vi.fn(async () => candidate), refresh: vi.fn(async () => candidate), link: vi.fn(async () => ({ url: 'https://s.shopee.com.br/test', fullUrl: 'https://s.shopee.com.br/test', provider: 'SHOPEE' as const, productUrl: product.productUrl, itemId: product.id })), title: vi.fn(async (): Promise<AffiliateCopy> => ({ title: product.title, source: 'ORIGINAL' })) }
  const preview = await previewAffiliateProduct(db, 'tenant', 'actor', 'segment', product.id, ports)
  expect(read).toHaveBeenCalledWith({ where: { tenantId_provider: { tenantId: 'tenant', provider: 'SHOPEE' } } })
  expect(readAffiliateProductPreview(preview.previewToken, 'tenant', 'actor', 'segment')).toMatchObject({ itemId: product.id, affiliateUrl: 'https://s.shopee.com.br/test', priceCents: 2130, oldPriceCents:3492, oldPriceEstimated:true, reportedDiscountPercent:39 })
  expect(preview.message).toContain('De (estimado):')
  expect(preview.message).toContain('39% OFF')
  ports.title.mockResolvedValue({title:product.title,headline:'Um brinquedo para sua rotina ✨',source:'OPENAI'})
  const next=await regenerateAffiliateProductTitle(db,'tenant','actor','segment',preview.previewToken,ports)
  expect(readAffiliateProductPreview(next.previewToken,'tenant','actor','segment')).toMatchObject({priceCents:2130,oldPriceCents:3492,oldPriceEstimated:true,reportedDiscountPercent:39})
  expect(next.message).toContain('39% OFF');expect(next.message).toContain('De (estimado):');expect(next.expiresAt).toBe(preview.expiresAt)
})
async function fixture() {
  const product={id:'MLB123456',catalogId:'MLB123',title:'Árvore de Natal verde',productUrl:'https://www.mercadolivre.com.br/p/MLB123?wid=MLB123456',priceCents:2590,oldPriceCents:3990,imageUrl:'https://http2.mlstatic.com/fixture.jpg',checkedAt:new Date().toISOString()}
  const candidate={...product,evaluation:evaluateAffiliateProduct(product,[]),sourceTerm:'Natal',sourcePage:1}
  const segment={id:'segment',name:'Natal',updatedAt:new Date()}
  const mocks={affiliateSegment:{findFirst:vi.fn(async()=>segment)},affiliateConnection:{findUnique:vi.fn(async():Promise<{id:string;credentials:string;status:string}|null>=>null)},affiliateGroup:{findMany:vi.fn(async()=>[{id:'group',name:'Natal #1'}])},affiliateProductDecision:{findUnique:vi.fn(async():Promise<{decision:string}|null>=>null)}}
  const db=mocks as unknown as PrismaClient
  const ports={candidate:vi.fn(async()=>candidate),refresh:vi.fn(async()=>candidate),link:vi.fn(async()=>({url:'https://meli.la/fixture',fullUrl:'https://www.mercadolivre.com.br/social/test',tag:'test',profile:'test'})),title:vi.fn(async():Promise<AffiliateCopy>=>({title:product.title,headline:'Uma árvore de Natal para sua sala 🎄',source:'OPENAI'}))}
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
  expect(ports.title).toHaveBeenCalledWith(db,'tenant',candidate,undefined,{title:preview.title,headline:preview.headline})
  expect(ports.refresh).not.toHaveBeenCalled();expect(ports.link).not.toHaveBeenCalled()
})

it('rejects tampering and other scopes before consulting the candidate or AI',async()=>{
  const {db,ports,preview}=await fixture()
  for(const [tenant,actor,segment,token] of [['other','actor','segment',preview.previewToken],['tenant','other','segment',preview.previewToken],['tenant','actor','other',preview.previewToken],['tenant','actor','segment',preview.previewToken+'x']]) {
    await expect(regenerateAffiliateProductTitle(db,tenant,actor,segment,token,ports)).rejects.toHaveProperty('status')
  }
  expect(ports.candidate).not.toHaveBeenCalled();expect(ports.title).not.toHaveBeenCalled()
})

it('still accepts a signed v1 preview issued without headline',async()=>{
  const {preview}=await fixture()
  const {headline:_headline,...legacy}=readAffiliateProductPreview(preview.previewToken,'tenant','actor','segment')
  expect(_headline).toBeDefined()
  legacy.message=offerMessage(legacy)
  const body=Buffer.from(JSON.stringify(legacy)).toString('base64url')
  const token=body+'.'+createHmac('sha256',env.JWT_SECRET).update('affiliate-preview:v1:'+body).digest('base64url')
  expect(readAffiliateProductPreview(token,'tenant','actor','segment')).toEqual(legacy)
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

it('regenerates only the headline, signs both lines and sends the exact approved message',async()=>{
  const {db,mocks,ports,preview}=await fixture()
  ports.title.mockResolvedValue({title:preview.title,headline:'Sua sala com uma árvore de Natal 🎄',source:'OPENAI'})
  const regenerated=await regenerateAffiliateProductTitle(db,'tenant','actor','segment',preview.previewToken,ports)
  const signed=readAffiliateProductPreview(regenerated.previewToken,'tenant','actor','segment')
  expect(regenerated.message.split('\n').slice(0,2)).toEqual([regenerated.headline,`*${preview.title}*`])
  expect(signed.headline).toBe(regenerated.headline)
  expect(signed.message).toBe(regenerated.message)
  const offer={...signed,id:'offer',status:'DRAFT',checkedAt:new Date(signed.checkedAt),expiresAt:null,updatedAt:new Date(),note:'',segment:{enabled:true}}
  const broadcast={id:'broadcast',offerId:'offer'}
  const tx={...mocks,$queryRaw:vi.fn(async()=>[]),affiliateBroadcast:{findUnique:vi.fn(async()=>null),create:vi.fn(async()=>broadcast)},affiliateOffer:{create:vi.fn(async()=>offer),findFirst:vi.fn(async()=>offer)},affiliateDelivery:{findFirst:vi.fn(async()=>null),createMany:vi.fn(async()=>({count:1})),count:vi.fn(async()=>1)},affiliateProductDecision:{findUnique:vi.fn(async()=>null),create:vi.fn(async()=>({}))},auditLog:{create:vi.fn(async()=>({}))}}
  const sendingDb={...tx,$transaction:async(work:(client:typeof tx)=>Promise<unknown>)=>work(tx)} as unknown as PrismaClient
  await expect(sendAffiliateProduct(sendingDb,'tenant','actor','segment',regenerated.previewToken)).resolves.toMatchObject({broadcastId:'broadcast',groups:1})
  expect(tx.affiliateBroadcast.create).toHaveBeenCalledWith({data:expect.objectContaining({message:regenerated.message})})
  expect(ports.title).toHaveBeenCalledOnce()
})
