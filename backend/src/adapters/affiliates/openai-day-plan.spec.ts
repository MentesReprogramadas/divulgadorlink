import { afterEach, expect, it, vi } from 'vitest'
import { suggestDayProductOrder } from './openai-day-plan'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
const p={id:'MLB123',catalogId:'MLB123',title:'Produto de Natal',priceCents:1000,oldPriceCents:2000,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:new Date().toISOString(),sentCount:3,lastSentAt:'2026-10-30T12:00:00Z',sourceTerm:'Natal',sourcePage:1}
const products=[{...p,evaluation:evaluateAffiliateProduct(p,[])}]
afterEach(()=>vi.unstubAllEnvs())
it('percorre candidatos além da primeira amostra e seleciona mais de 24 sem uma chamada por produto',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const catalog=Array.from({length:250},(_,i)=>({...products[0],id:'MLB'+i,title:'Enfeite Natal modelo '+i}))
 const renew=vi.fn(async()=>{})
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{
  const request=JSON.parse(String(init?.body)),data=JSON.parse(request.messages[1].content)
  const selected=data.products.slice(0,Math.min(data.requestedCount,70))
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coreCount:selected.length,relatedCount:0,items:selected.map((p:{id:string})=>({id:p.id,context:{role:'CORE',framing:'THEME',reason:'Produto do núcleo do tema.'}}))})}}]}))
 }) as unknown as typeof fetch
 const selected=await suggestDayProductOrder(catalog,fetcher,{name:'Natal'},140,renew)
 expect(selected).toHaveLength(140);expect(new Set(selected.map(p=>p.id)).size).toBe(140)
 expect(selected[70].id).toBe('MLB120');expect(fetcher).toHaveBeenCalledTimes(2);expect(renew).toHaveBeenCalledTimes(2)
 for(const [,init] of vi.mocked(fetcher).mock.calls){const request=JSON.parse(String(init?.body));expect(JSON.parse(request.messages[1].content).products.length).toBeLessThanOrEqual(120)}
})
it('envia desconto e contagem de envios; só aceita ids existentes, sem duplicação',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fixture-not-real')
  const respond=(itemIds:string[])=>vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coreCount:itemIds.length,relatedCount:0,items:itemIds.map(id=>({id,context:{role:'CORE',framing:'THEME',reason:'Produto adequado ao tema do grupo.'}}))})}}]}))) as unknown as typeof fetch
  const fetcher=respond(['p0'])
  expect(await suggestDayProductOrder(products,fetcher,{name:'Jardinagem',discovery:{terms:['plantas']}},12)).toEqual([{id:'MLB123',context:{role:'CORE',framing:'THEME',reason:'Produto adequado ao tema do grupo.'}}])
  const request=JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body))
  expect(JSON.parse(request.messages[1].content).products[0]).toMatchObject({discountPercent:50,sentCount:3,lastSentAt:p.lastSentAt})
  expect(request.store).toBe(false)
  expect(request.response_format.json_schema.schema.properties.items.items.properties.id.enum).toEqual(['p0'])
  expect(JSON.parse(request.messages[1].content)).toMatchObject({segment:{name:'Jardinagem',terms:['plantas']},requestedCount:12})
  expect(request.messages[0].content).toContain('nunca uma quota')
  for(const ids of [['foreign'],['p0','p0'],[]])expect(await suggestDayProductOrder(products,respond(ids))).toEqual([])
})
it('usa regras sem chave ou resposta interrompida, sem comprometer o lote',async()=>{
  const fetcher=vi.fn(async()=>new Response('{}',{status:503})) as unknown as typeof fetch
  vi.stubEnv('OPENAI_API_KEY','');expect(await suggestDayProductOrder(products,fetcher)).toEqual([]);expect(fetcher).not.toHaveBeenCalled()
  vi.stubEnv('OPENAI_API_KEY','fixture');expect(await suggestDayProductOrder(products,fetcher)).toEqual([])
})

it.each([{coreCount:12,relatedCount:4,expected:2},{coreCount:10,relatedCount:5,expected:3},{coreCount:12,relatedCount:0,expected:0}])('ajusta complementos à proporção calculada pela IA: $coreCount/$relatedCount',async({coreCount,relatedCount,expected})=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const catalog=Array.from({length:12},(_,i)=>({...products[0],id:'MLB'+i}))
 const items=catalog.map((_,i)=>({id:'p'+i,context:{role:i<6?'CORE':'RELATED',framing:i<6?'THEME':'GIFT',reason:'Relação contextual escolhida pela IA.'}}))
 const fetcher=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coreCount,relatedCount,items})}}]}))) as unknown as typeof fetch
 const selected=await suggestDayProductOrder(catalog,fetcher,{name:'Natal'},24)
 expect(selected.filter(p=>p.context.role==='CORE')).toHaveLength(6)
 expect(selected.filter(p=>p.context.role==='RELATED')).toHaveLength(expected)
 expect(selected.every(p=>p.id.startsWith('MLB'))).toBe(true)
})
it.each([0,1])('pede correção se a composição não prioriza o núcleo: %i',async(initialCore)=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const response=(coreCount:number,relatedCount:number)=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coreCount,relatedCount,items:[{id:'p0',context:{role:'CORE',framing:'THEME',reason:'Produto do núcleo do grupo.'}}]})}}]}))
 const fetcher=vi.fn().mockResolvedValueOnce(response(initialCore,1)).mockResolvedValueOnce(response(1,0)) as unknown as typeof fetch
 expect(await suggestDayProductOrder(products,fetcher)).toHaveLength(1)
 expect(fetcher).toHaveBeenCalledTimes(2)
 expect(JSON.parse(String(vi.mocked(fetcher).mock.calls[1][1]?.body)).messages.at(-1).content).toContain('Não reclassifique')
})
