import { describe, expect, it } from 'vitest'
import { approvedPreview, facetCopy, linkFingerprint, seoEditorialSchema, seoCollectionSchema, seoTextSchema } from './seo-editorial'
import type { LinkRecord } from '@/repositories/links-repository'

const link = { id:'one',tenantId:'t',name:'Título restrito',description:'Descrição restrita',canonicalUrl:'https://t.me/one',networkId:'net',nicheId:'adult',updatedAt:new Date('2026-10-26') } as LinkRecord

describe('editorial público SEO', () => {
  it('invalida prévia quando conteúdo, destino ou revisão do anúncio muda', () => {
    const preview = {title:'Comunidade para adultos',description:'Apresentação pública revisada.',explicit:true,approved:true,fingerprint:linkFingerprint(link)}
    const state={version:1,facets:{},collections:[],links:{one:preview}}
    expect(approvedPreview(state,link)).toEqual(preview)
    for(const changed of [{name:'Outra pessoa'},{canonicalUrl:'https://t.me/outro'},{updatedAt:new Date('2026-10-27')},{tenantId:'outro'}]) expect(approvedPreview(state,{...link,...changed})).toBeNull()
    expect(approvedPreview({...state,links:{one:{...preview,approved:false}}},link)).toBeNull()
  })
  it('valida texto puro, chaves seguras e coleções com filtro real', () => {
    const text={title:'Ofertas',description:'Comunidades de ofertas.',explicit:false,approved:true}
    expect(seoTextSchema.safeParse(text).success).toBe(true)
    expect(seoTextSchema.safeParse({...text,title:'<script>alert(1)</script>'}).success).toBe(false)
    expect(seoTextSchema.safeParse({...text,description:'x'.repeat(1001)}).success).toBe(false)
    expect(seoCollectionSchema.safeParse({...text,slug:'ofertas-whatsapp',networkSlug:'whatsapp',nicheSlug:null}).success).toBe(true)
    expect(seoCollectionSchema.safeParse({...text,slug:'ofertas',networkSlug:null,nicheSlug:null}).success).toBe(false)
    expect(seoEditorialSchema.safeParse({version:0,links:{},collections:[],facets:JSON.parse('{"__proto__":{}}')}).success).toBe(false)
  })
  it('descreve intenção de rede/nicho sem misturar apostas com conteúdo sexual', () => {
    expect(facetCopy('network','telegram','Telegram').title).toContain('Grupos e canais')
    expect(facetCopy('network','whatsapp','Whatsapp').title).toContain('WhatsApp')
    expect(facetCopy('network','discord','Discord').title).toContain('Servidores')
    expect(facetCopy('niche','apostas','Apostas').explicit).toBe(false)
    expect(facetCopy('niche','adulto','Adulto').explicit).toBe(true)
    expect(facetCopy('network','onlyfans','OnlyFans').explicit).toBe(true)
    expect(facetCopy('niche','nova-categoria','Nova categoria').title).toContain('Nova categoria')
  })
  it('coleções aceitam curadoria opcional com IDs únicos e limite explícito',()=>{
    const base={title:'Achadinhos Shopee',description:'Grupos com ofertas da loja.',explicit:false,approved:true,slug:'achadinhos-shopee',networkSlug:'whatsapp',nicheSlug:'ofertas'}
    expect(seoCollectionSchema.safeParse(base).success).toBe(true)
    expect(seoCollectionSchema.safeParse({...base,linkIds:['link-one','link-two']}).success).toBe(true)
    for(const linkIds of [[],['duplicado','duplicado'],['https://other.test/link'],Array.from({length:201},(_,index)=>'id-'+index)])expect(seoCollectionSchema.safeParse({...base,linkIds}).success).toBe(false)
  })
})
