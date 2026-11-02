import { afterEach, expect, it, vi } from 'vitest'
import { suggestDayProductOrder } from './openai-day-plan'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
import { selectDayProducts } from '@/domain/affiliates/day-plan'
import { isShopeeProduct } from '@/domain/affiliates/shopee'
const p={id:'MLB123',catalogId:'MLB123',title:'Produto de Natal',priceCents:1000,oldPriceCents:2000,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:new Date().toISOString(),sentCount:3,lastSentAt:'2026-10-30T12:00:00Z',sourceTerm:'Natal',sourcePage:1}
const products=[{...p,evaluation:evaluateAffiliateProduct(p,[])}]
afterEach(()=>vi.unstubAllEnvs())
it.each([{refuse:false,initialMl:0,availableMl:16},{refuse:true,initialMl:0,availableMl:16},{refuse:false,initialMl:1,availableMl:16},{refuse:true,initialMl:1,availableMl:16},{refuse:false,initialMl:0,availableMl:1}])('avalia semanticamente loja minoritária em Tecnologia sem termos: $initialMl ML, recusa $refuse',async({refuse,initialMl,availableMl})=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const catalog=['SHP','MLB'].flatMap(provider=>Array.from({length:provider==='MLB'?availableMl:16},(_,i)=>{const id=provider==='SHP'?`SHP10_${i+100}`:'MLB'+(100+i);return {...products[0],id,catalogId:id,title:provider==='SHP'?'Smartphone modelo '+i:(refuse&&i>0?'Ração para cachorro ':'Mouse gamer modelo ')+i}}))
 const renew=vi.fn(async()=>{})
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{
  const data=JSON.parse(JSON.parse(String(init?.body)).messages[1].content),missing=data.products.every((p:{provider:string})=>p.provider==='MERCADO_LIVRE')
  if(missing&&refuse)return Response.json({choices:[{finish_reason:'stop',message:{content:'',refusal:'Os produtos não pertencem ao tema.'}}]})
  const chosen=missing?data.products.slice(0,12):[...data.products.filter((p:{provider:string})=>p.provider==='SHOPEE').slice(0,12-initialMl),...data.products.filter((p:{provider:string})=>p.provider==='MERCADO_LIVRE').slice(0,initialMl)]
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coreCount:chosen.length,relatedCount:0,items:chosen.map((p:{id:string})=>({id:p.id,context:{role:'CORE',framing:'THEME',reason:'Equipamento de tecnologia pertinente ao grupo.'}}))})}}]})
 }) as unknown as typeof fetch
 const analysis=await suggestDayProductOrder(catalog,fetcher,{name:'Tecnologia'},12,renew)
 expect(fetcher).toHaveBeenCalledTimes(2);expect(renew).toHaveBeenCalledTimes(2)
 const selected=selectDayProducts(catalog,{name:'Tecnologia'},12,analysis)
 expect(selected).toHaveLength(12)
 expect(selected.filter(p=>!isShopeeProduct(p.id))).toHaveLength(refuse?initialMl:Math.min(6,availableMl))
 expect(selected.filter(p=>p.title.includes('Ração'))).toHaveLength(0)
})
it('amostra lojas em qualquer segmento e informa fornecedor à IA',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const catalog=[...Array.from({length:180},(_,i)=>({...products[0],id:`SHP10_${100+i}`,title:'Celular modelo '+i})),...Array.from({length:80},(_,i)=>({...products[0],id:'MLB'+(100+i),title:'Mouse gamer modelo '+i}))]
 const fetcher=vi.fn(async()=>new Response('{}',{status:503})) as unknown as typeof fetch
 await suggestDayProductOrder(catalog,fetcher,{name:'Tecnologia'},24)
 const request=JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body)),data=JSON.parse(request.messages[1].content)
 expect(data.products.filter((p:{provider:string})=>p.provider==='MERCADO_LIVRE')).toHaveLength(60)
 expect(data.products.filter((p:{provider:string})=>p.provider==='SHOPEE')).toHaveLength(60)
 expect(request.messages[0].content).toContain('lojas')
})
it('mostra categorias Pets escassas na primeira janela e informa categoria para a IA',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const catalog=[...Array.from({length:500},(_,i)=>({...products[0],id:'food'+i,title:'Ração para cachorro marca '+i})),...['Areia sanitária para gato','Comedouro para cachorro','Shampoo para cachorro','Arranhador para gato','Brinquedo para cachorro'].map((title,i)=>({...products[0],id:'other'+i,title}))]
 const fetcher=vi.fn(async()=>new Response('{}',{status:503})) as unknown as typeof fetch
 expect(await suggestDayProductOrder(catalog,fetcher,{name:'Pets'},24)).toEqual([])
 const request=JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body)),data=JSON.parse(request.messages[1].content)
 expect(new Set(data.products.map((p:{category:string})=>p.category))).toEqual(new Set(['FOOD','LITTER','FEEDING','HYGIENE','SCRATCHING','TOYS']))
 expect(data.products).toHaveLength(120)
 expect(request.messages[0].content).toContain('ração')
})
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
it('aproveita resposta válida maior que o restante sem perder predominância ou validar só o prefixo',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fixture')
 const catalog=Array.from({length:12},(_,i)=>({...products[0],id:'MLB'+i}))
 const items=catalog.map((_,i)=>({id:'p'+i,context:{role:i<4?'RELATED':'CORE',framing:i<4?'GIFT':'THEME',reason:'Relação contextual analisada pela IA.'}}))
 const respond=(selected:typeof items)=>vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coreCount:8,relatedCount:4,items:selected})}}]}))) as unknown as typeof fetch
 const selected=await suggestDayProductOrder(catalog,respond(items),{name:'Natal'},6)
 expect(selected).toHaveLength(6);expect(selected.filter(p=>p.context.role==='CORE')).toHaveLength(4)
 expect(selected.every(p=>catalog.some(c=>c.id===p.id))).toBe(true)
 expect(await suggestDayProductOrder(catalog,respond([...items.slice(0,11),{...items[11],id:'foreign'}]),{name:'Natal'},6)).toEqual([])
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
