import {it,expect,vi,afterEach} from 'vitest'
import {expandAffiliateTerms,generateAffiliateTitle} from './openai-intelligence'
import type {PrismaClient} from '@prisma/client'
vi.stubEnv('OPENAI_API_KEY','test-never-real')
afterEach(()=>vi.unstubAllEnvs())
const response=(output:unknown)=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output),refusal:null}}]}))
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
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Chaveiro de Natal sortimento'}))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher)).toEqual({title:'Chaveiro de Natal sortimento',source:'OPENAI'})
  const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
  expect(body.messages[0].content).toContain('Não use sinônimos, flexões ou derivações')
  expect(body.messages[0].content).toContain('sortimento não pode virar sortido')
  expect(body.messages[0].content).toContain('remover repetições')
  expect(body.messages[1]).toEqual({role:'user',content:product.title})
})
it('regenerates without the title cache, excludes the previous title and rejects repeated or invented output',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Luminária USB branca regeneração',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  const fetcher=vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response({title:'Luminária branca USB'}))
    .mockResolvedValueOnce(response({title:'USB Luminária branca'}))
    .mockResolvedValueOnce(response({title:'Luminária USB branca'}))
    .mockResolvedValueOnce(response({title:'Luminária USB barata'}))
  const generate=()=>generateAffiliateTitle({} as PrismaClient,'tenant',product,fetcher,'Luminária USB branca')
  expect(await generate()).toMatchObject({source:'OPENAI',title:'Luminária branca USB'})
  expect(await generate()).toMatchObject({source:'OPENAI',title:'USB Luminária branca'})
  expect(await generate()).toMatchObject({source:'ORIGINAL'})
  expect(await generate()).toMatchObject({source:'ORIGINAL'})
  expect(fetcher).toHaveBeenCalledTimes(4)
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).messages[1].content).toContain('previousTitle')
})
it('preserves qualified product facts instead of changing sem WiFi into com WiFi',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const fetcher=vi.fn<typeof fetch>(async()=>response({title:'Câmera com WiFi'}))
  const product={id:'MLB1',catalogId:'MLB2',title:'Câmera sem WiFi',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  for(const title of ['Câmera sem WiFi','Câmera não acompanha cartão','Somente capa de câmera','Câmera without WiFi']){
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',{...product,title},fetcher)).toEqual({title,source:'ORIGINAL'})
    expect(await generateAffiliateTitle({} as PrismaClient,'tenant',{...product,title},fetcher,title)).toEqual({title,source:'ORIGINAL'})
  }
  expect(fetcher).not.toHaveBeenCalled()
})
it('rejects output containing no product words',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const product={id:'MLB1',catalogId:'MLB2',title:'Câmera digital fixture emoji',productUrl:'https://www.mercadolivre.com.br',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product,vi.fn(async()=>response({title:'🔥🔥🔥'})))).toEqual({title:product.title,source:'ORIGINAL'})
})
