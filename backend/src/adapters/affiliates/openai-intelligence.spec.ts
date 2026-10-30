import {it,expect,vi,afterEach,beforeEach} from 'vitest'
import {expandAffiliateTerms,generateAffiliateTitle} from './openai-intelligence'
import type {PrismaClient} from '@prisma/client'
beforeEach(()=>vi.stubEnv('OPENAI_API_KEY','test-never-real'))
afterEach(()=>vi.unstubAllEnvs())
const response=(output:unknown)=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output),refusal:null}}]}))
it('accepts cão in a real headline for Cães without inventing a new product fact',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'SHP1_2',catalogId:'SHP1_2',title:'Bifinho para Cães Lion Pet 1 Kg – Petisco Canino Saboroso em Carne ou Frango, Ideal para Recompensa, Treinamento Pet.',productUrl:'https://shopee.com.br/product/1/2',priceCents:2750,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Bifinho para Cães Lion Pet 1 Kg',headline:'Um petisco saboroso para seu cão 🐾'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher)).toMatchObject({source:'OPENAI',headline:'Um petisco saboroso para seu cão 🐾'})
})
it('keeps the previous objective title when the model drops a measurement but provides a safe new headline',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Árvore de Natal 180 cm safe fallback',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Árvore de Natal',headline:'Sua sala com uma árvore de Natal 🎄'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher,{title:'Árvore de Natal 180 cm',headline:'Uma árvore de Natal para sua casa 🎄'})).toMatchObject({title:'Árvore de Natal 180 cm',headline:'Sua sala com uma árvore de Natal 🎄',source:'OPENAI'})
})
it('regenerates neutral copy for qualified products while preserving the restriction and excluding denied features',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Câmera sem WiFi',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Câmera com WiFi',headline:'Uma câmera para sua casa 📷'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher,{title:product.title})).toMatchObject({title:'Câmera sem WiFi',headline:'Uma câmera para sua casa 📷',source:'OPENAI'})
  const unsafe=vi.fn<typeof fetch>(async()=>response({title:product.title,headline:'Uma câmera com WiFi para sua casa 📷'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,unsafe,{title:product.title})).toEqual({title:product.title,source:'ORIGINAL'})
})
it('uses strict bounded JSON, store false and caches public topic expansion',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>response({terms:['luzes natalinas','enfeites']}))
  expect(await expandAffiliateTerms('Natal fixture',fetcher)).toEqual(['Natal fixture','luzes natalinas','enfeites'])
  await expandAffiliateTerms('Natal fixture',fetcher)
  expect(fetcher).toHaveBeenCalledOnce()
  const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
  expect(body).toMatchObject({model:'gpt-4o-mini',store:false,max_completion_tokens:250,response_format:{type:'json_schema',json_schema:{strict:true}}})
})
it('rejects invented title words and preserves original on unavailable AI',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Luminária USB branca fixture',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Luminária incrível barata'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher)).toEqual({title:product.title,source:'ORIGINAL'})
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',{...product,title:'Copo térmico verde fixture'},vi.fn(async()=>{throw new Error('offline')}))).toMatchObject({source:'ORIGINAL'})
})
it('asks for literal deduplication and accepts a shorter objective title without synonym facts',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Chaveiro, chaveiro, Natal, Natal, santo Natal, sortimento',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Chaveiro de Natal sortimento',headline:'Um chaveiro de Natal para presentear ✨'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher)).toEqual({title:'Chaveiro de Natal sortimento',headline:'Um chaveiro de Natal para presentear ✨',source:'OPENAI'})
  const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
  expect(body.messages[0].content).toContain('Não use sinônimos, flexões ou derivações')
  expect(body.messages[0].content).toContain('sortimento não pode virar sortido')
  expect(body.messages[0].content).toContain('remover repetições')
  expect(body.messages[1]).toEqual({role:'user',content:[{type:'text',text:JSON.stringify({originalTitle:product.title})}]})
})
it('regenerates without the title cache, excludes the previous title and rejects repeated or invented output',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Luminária USB branca regeneração',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response({title:'Luminária branca USB',headline:'Uma luminária para sua casa ✨'}))
    .mockResolvedValueOnce(response({title:'USB Luminária branca',headline:'Confira uma luminária para sua sala ✨'}))
    .mockResolvedValueOnce(response({title:'Luminária USB branca',headline:'Uma luminária para sua rotina ✨'}))
    .mockResolvedValueOnce(response({title:'Luminária USB barata',headline:'Confira uma luminária ✨'}))
  const generate=()=>generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher,{title:'Luminária USB branca',headline:'Uma luminária para sua rotina ✨'})
  expect(await generate()).toMatchObject({source:'OPENAI',title:'Luminária branca USB'})
  expect(await generate()).toMatchObject({source:'OPENAI',title:'USB Luminária branca'})
  expect(await generate()).toMatchObject({source:'ORIGINAL'})
  expect(await generate()).toMatchObject({source:'ORIGINAL'})
  expect(fetcher).toHaveBeenCalledTimes(4)
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).messages[1].content[0].text).toContain('previousCopy')
})
it('preserves qualified product facts instead of changing sem WiFi into com WiFi',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Câmera com WiFi'}))
  const product={id:'MLB1',catalogId:'MLB2',title:'Câmera sem WiFi',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  for(const title of ['Câmera sem WiFi','Câmera não acompanha cartão','Somente capa de câmera','Câmera without WiFi']){
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',{...product,title},fetcher)).toEqual({title,source:'ORIGINAL'})
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',{...product,title},fetcher,title)).toEqual({title,source:'ORIGINAL'})
  }
  expect(fetcher).toHaveBeenCalledTimes(8)
})
it('rejects output containing no product words',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Câmera digital fixture emoji',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,vi.fn(async()=>response({title:'🔥🔥🔥'})))).toEqual({title:product.title,source:'ORIGINAL'})
})

it('creates a natural headline from original title and a trusted product image',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Árvore de Natal 180 cm',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:'https://http2.mlstatic.com/tree-copy-fixture.jpg',checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Árvore de Natal 180 cm',headline:'Uma árvore de Natal para sua sala 🎄'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher)).toEqual({title:product.title,headline:'Uma árvore de Natal para sua sala 🎄',source:'OPENAI'})
  const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
  expect(body.messages[1].content).toEqual([{type:'text',text:expect.stringContaining(product.title)},{type:'image_url',image_url:{url:product.imageUrl,detail:'low'}}])
  expect(body.messages[0].content).toContain('A imagem não comprova medidas')
})

it('rejects unverified headline facts, hype and hostile images before model input',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Árvore de Natal 180 cm copy guard',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:'https://http2.mlstatic.com.evil.test/tree.jpg',checkedAt:new Date().toISOString()}
  for(const headline of ['Uma árvore de Natal de madeira 🎄','Árvore de Natal 210 cm 🎄','Últimas unidades de árvore de Natal 🎄','Uma árvore incrível de Natal 🎄']) {
    const fetcher=vi.fn<typeof fetch>(async()=>response({title:product.title,headline}))
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher,headline)).toMatchObject({source:'ORIGINAL',title:product.title})
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).messages[1].content).not.toContainEqual(expect.objectContaining({type:'image_url'}))
  }
})

it('regenerates the headline while keeping the objective identity unchanged',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Árvore de Natal 180 cm repeat copy',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const previous={title:'Árvore de Natal 180 cm',headline:'Uma árvore de Natal para sua sala 🎄'}
  const fetcher=vi.fn<typeof fetch>(async()=>response({...previous,headline:'Sua sala com uma árvore de Natal 🎄'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher,previous)).toEqual({title:previous.title,headline:'Sua sala com uma árvore de Natal 🎄',source:'OPENAI'})
})

it('keeps units and measurements in the objective identity and refuses incomplete model output',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Árvore de Natal 180 cm unidade',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  for(const output of [{title:'Árvore de Natal 180',headline:'Uma árvore para sua sala 🎄'},{title:'Árvore de Natal 180 cm'}]) {
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,vi.fn(async()=>response(output)),'retry')).toMatchObject({source:'headline' in output?'OPENAI':'ORIGINAL',title:product.title})
  }
})

it('accepts natural gift contexts without inventing product properties',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  for(const [title,headline] of [['Tênis feminino','Um tênis para acompanhar sua rotina 👟'],['Brinquedo','Um brinquedo para momentos de diversão 🎁'],['Presente','Um presente para quem você ama 🎁']]) {
    const product={id:'MLB1',catalogId:'MLB2',title,productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,vi.fn(async()=>response({title,headline})),'retry')).toEqual({title,headline,source:'OPENAI'})
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,vi.fn(async()=>response({title,headline:headline+' resistente'})),'retry')).toMatchObject({source:'ORIGINAL'})
  }
})
