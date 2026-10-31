import { afterEach, expect, it, vi } from 'vitest'
import { suggestDayProductOrder } from './openai-day-plan'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
const p={id:'MLB123',catalogId:'MLB123',title:'Produto de Natal',priceCents:1000,oldPriceCents:2000,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:new Date().toISOString(),sentCount:3,lastSentAt:'2026-10-30T12:00:00Z',sourceTerm:'Natal',sourcePage:1}
const products=[{...p,evaluation:evaluateAffiliateProduct(p,[])}]
afterEach(()=>vi.unstubAllEnvs())
it('envia desconto e contagem de envios; só aceita ids existentes, sem duplicação',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fixture-not-real')
  const respond=(itemIds:string[])=>vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({itemIds})}}]}))) as unknown as typeof fetch
  const fetcher=respond(['MLB123'])
  expect(await suggestDayProductOrder(products,fetcher)).toEqual(['MLB123'])
  const request=JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body))
  expect(JSON.parse(request.messages[1].content).products[0]).toMatchObject({discountPercent:50,sentCount:3,lastSentAt:p.lastSentAt})
  expect(request.store).toBe(false)
  for(const ids of [['foreign'],['MLB123','MLB123'],[]])expect(await suggestDayProductOrder(products,respond(ids))).toEqual([])
})
it('usa regras sem chave ou resposta interrompida, sem comprometer o lote',async()=>{
  const fetcher=vi.fn(async()=>new Response('{}',{status:503})) as unknown as typeof fetch
  vi.stubEnv('OPENAI_API_KEY','');expect(await suggestDayProductOrder(products,fetcher)).toEqual([]);expect(fetcher).not.toHaveBeenCalled()
  vi.stubEnv('OPENAI_API_KEY','fixture');expect(await suggestDayProductOrder(products,fetcher)).toEqual([])
})
