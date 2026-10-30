import type { PrismaClient } from '@prisma/client'
import { afterEach, expect, it, vi } from 'vitest'
import { generateAffiliateTitle } from './openai-intelligence'
import { offerMessage } from '@/domain/affiliates/contracts'

afterEach(()=>vi.unstubAllEnvs())
const tree='Árvore De Natal Luxo 210 Cm 1200 Galhos NEXMIDIO Verde Galhos Pinheiro Verde-musgo Arvore de Natal 210cm arvore natal'
const product=(title:string)=>({id:'MLB1',catalogId:'MLB2',title,productUrl:'https://www.mercadolivre.com.br',priceCents:22724,oldPriceCents:38800,imageUrl:null,checkedAt:new Date().toISOString()})
it('encurta o exemplo real mesmo com IA indisponível e mantém medidas e quantidade',async()=>{
  vi.stubEnv('OPENAI_API_KEY','')
  const result=await generateAffiliateTitle({} as PrismaClient,'tenant',product(tree))
  expect(result).toEqual({title:'Árvore De Natal Luxo 210 Cm 1200 Galhos NEXMIDIO Verde',source:'ORIGINAL'})
  expect(result.title.length).toBeLessThanOrEqual(60)
})
it.each([
  ['Cama Cama Para Cachorro Cachorro Lavável Lavável 70 cm 50 cm Cama Pet Pet', ['70 cm','50 cm']],
  ['Ração Premium Racao Premium Cães Adultos Frango Frango 15 kg Cachorro Adulto', ['15 kg']],
  ['Kit Kit 2 Peças Natal Natal Enfeite Enfeite 220 V 110 V Decoração Decoração', ['2 Peças','220 V','110 V']],
])('limita e remove repetições de %s sem perder especificações',async(title,facts)=>{
  vi.stubEnv('OPENAI_API_KEY','')
  const result=await generateAffiliateTitle({} as PrismaClient,'tenant',product(title))
  expect(result.title.length).toBeLessThanOrEqual(60)
  for(const fact of facts)expect(result.title).toContain(fact)
  const words=result.title.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/\p{L}+/gu)!.filter(w=>!['de','do','da','para','com','e','cm','kg','v'].includes(w))
  expect(new Set(words).size).toBe(words.length)
})
it('não deixa resposta longa ou repetida da IA escapar para o título final',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({title:tree,headline:'Uma árvore de Natal para sua sala 🎄'})}}]})))
  const result=await generateAffiliateTitle({} as PrismaClient,'tenant',product(tree),fetcher,'retry')
  expect(result.title.length).toBeLessThanOrEqual(60)
  expect(result.title.match(/Natal/gi)).toHaveLength(1)
})
it('aceita medidas equivalentes com e sem espaço sem voltar ao título de SEO',async()=>{
  vi.stubEnv('OPENAI_API_KEY','test-never-real')
  const title='Árvore de Natal NEXMIDIO 210 cm 1200 Galhos'
  const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({title,headline:'Uma árvore de Natal para sua sala 🎄'})}}]})))
  expect(await generateAffiliateTitle({} as PrismaClient,'tenant',product(tree),fetcher,'measurement-retry')).toEqual({title,headline:'Uma árvore de Natal para sua sala 🎄',source:'OPENAI'})
})
it('mensagem de oferta também protege títulos antigos e mantém preço, economia e link',()=>{
  const message=offerMessage({...product(tree),affiliateUrl:'https://meli.la/2Rej1vz',headline:'Confira esta opção para você ✨'})
  expect(message.split('\n')[1]).toBe('*Árvore De Natal Luxo 210 Cm 1200 Galhos NEXMIDIO Verde*')
  expect(message.replace(/\u00a0/g,' ')).toContain('💰 *R$ 227,24*')
  expect(message.replace(/\u00a0/g,' ')).toContain('R$ 160,76')
  expect(message).toContain('https://meli.la/2Rej1vz')
})
