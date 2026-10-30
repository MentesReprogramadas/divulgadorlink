import { describe, expect, it } from 'vitest'
import { groupName, marketUrl, offerInput, offerIsCurrent, offerMessage, segmentInput, validInvite } from './contracts'

describe('contratos de afiliados', () => {
  it('aceita imagem enviada e conexões únicas, sem lançar para URL inválida',()=>{
    const base={name:'Natal',slug:'natal',imageUrl:'affiliate-image:0ad1244c-0422-4119-a1db-c4db91b6490b',instanceIds:['one','two']}
    expect(segmentInput.parse(base)).toEqual(base)
    expect(segmentInput.safeParse({...base,instanceIds:['one','one']}).success).toBe(false)
    expect(segmentInput.safeParse({...base,instanceIds:[]}).success).toBe(false)
    expect(segmentInput.safeParse({...base,imageUrl:'invalid'}).success).toBe(false)
    expect(marketUrl.safeParse('not a URL').success).toBe(false)
  })
  it('PATCH não injeta defaults nem apaga o modelo ao pausar ou arquivar',()=>{
    expect(segmentInput.partial().parse({enabled:false})).toEqual({enabled:false})
    expect(offerInput.partial().parse({priceCents:1990})).toEqual({priceCents:1990})
  })
  it('separa o nome interno da segmentação do nome público dos grupos',()=>{
    expect(segmentInput.parse({name:'Campanha Natal 2026',slug:'natal',groupName:'  Ofertas de Natal  '})).toMatchObject({name:'Campanha Natal 2026',groupName:'Ofertas de Natal'})
    expect(segmentInput.partial().parse({name:'Campanha interna'})).not.toHaveProperty('groupName')
    expect(segmentInput.safeParse({name:'Natal',slug:'natal',groupName:' '}).success).toBe(false)
  })
  it('rejeita destinos falsos e preserva URLs válidas', () => {
    for (const url of ['https://mercadolivre.com.br.evil.test/p/MLB1', 'https://a@mercadolivre.com.br/p/MLB1', 'http://meli.la/abc', 'https://meli.la:8443/abc']) expect(marketUrl.safeParse(url).success).toBe(false)
    expect(marketUrl.parse('https://produto.mercadolivre.com.br/MLB-123')).toContain('MLB-123')
    expect(() => validInvite('https://evil.test/redirect')).toThrow()
    expect(validInvite('AbCdEf0123456789AbCdEf')).toBe('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  })
  it('usa sequência persistida e não duplica sufixo', () => { expect(groupName('Natal #2', 4)).toBe('Natal #4') })
  it('não inventa desconto e neutraliza marcação em conteúdo', () => {
    const message = offerMessage({ title: 'Presente\n*surpresa*', priceCents: 1099, oldPriceCents: 999, affiliateUrl: 'https://meli.la/abc', note: '' })
    expect(message).toContain('*Presente surpresa*')
    expect(message).not.toContain('desconto')
    expect(message).toContain('Preço e estoque podem mudar. Confira as condições na loja.')
    expect(message).not.toContain('Link de afiliado')
  })
  it('coloca a chamada natural e a identificação objetiva nas primeiras duas linhas',()=>{
    const message=offerMessage({headline:'Uma árvore de Natal para sua sala 🎄',title:'Árvore de Natal 180 cm',priceCents:2590,oldPriceCents:3990,affiliateUrl:'https://meli.la/abc'})
    expect(message.split('\n').slice(0,2)).toEqual(['Uma árvore de Natal para sua sala 🎄','*Árvore de Natal 180 cm*'])
    expect(message).toContain('De: ~R$')
    expect(message).toContain('https://meli.la/abc')
    expect(message).toContain('_Preço e estoque podem mudar. Confira as condições na loja._')
  })
  it('usa copy própria para preço único, sem comparação ou economia inventada',()=>{
    for(const oldPriceCents of [null,999,1099]) {
      const message=offerMessage({title:'Kit de Natal',priceCents:1099,oldPriceCents,affiliateUrl:'https://meli.la/abc'}).replace(/\u00a0/g,' ')
      expect(message).toContain('✨ Um achado para você!')
      expect(message).toContain('💰 *R$ 10,99*')
      expect(message).toContain('Confira as opções e aproveite 👇\nhttps://meli.la/abc')
      for(const claim of ['Por:','De:','Economia','OFF','grátis','últimas unidades'])expect(message).not.toContain(claim)
    }
  })
  it('destaca economia calculada sem arredondar desconto para cima',()=>{
    const message=offerMessage({title:'Kit de Natal',priceCents:4743,oldPriceCents:5990,affiliateUrl:'https://meli.la/abc'}).replace(/\u00a0/g,' ')
    expect(message).toContain('🔥 Olha esse desconto!')
    expect(message).toContain('De: ~R$ 59,90~')
    expect(message).toContain('💰 *R$ 47,43*')
    expect(message).toContain('💸 Economize *R$ 12,47* · 20% OFF')
    expect(message).not.toContain('21%')
    expect(message).toContain('Preço e estoque podem mudar. Confira as condições na loja.')
    expect(message).not.toContain('Link de afiliado')
  })
  it('inclui o desconto informado na mensagem sem reconstruir preço anterior ou economia em reais',()=>{
    const offer={title:'Tênis feminino',priceCents:2130,oldPriceCents:null,reportedDiscountPercent:39,affiliateUrl:'https://s.shopee.com.br/test'}
    const message=offerMessage(offer).replace(/\u00a0/g,' ')
    expect(message).toContain('🔥 Olha esse desconto!')
    expect(message).toContain('💰 *R$ 21,30*')
    expect(message).toContain('💸 *39% OFF*')
    expect(message).not.toContain('De:')
    expect(message).not.toContain('Economize')
    for(const reportedDiscountPercent of [null,0,-1,101,3.5])expect(offerMessage({...offer,reportedDiscountPercent})).not.toContain('OFF')
    expect(offerMessage({...offer,priceCents:4743,oldPriceCents:5990})).toContain('20% OFF')
  })
  it('usa De e Economize sem o rótulo estimado na mensagem solicitada',()=>{
    const message=offerMessage({title:'Produto',priceCents:3112,oldPriceCents:3890,reportedDiscountPercent:20,oldPriceEstimated:true,affiliateUrl:'https://s.shopee.com.br/test'}).replace(/\u00a0/g,' ')
    expect(message).toContain('De: ~R$ 38,90~')
    expect(message).toContain('💰 *R$ 31,12*')
    expect(message).toContain('💸 Economize *R$ 7,78* · 20% OFF')
    expect(message).not.toMatch(/estimad/i)
  })
  it('rejeita dinheiro fracionado e revalida vencimento e idade do preço', () => {
    expect(offerInput.safeParse({ segmentId:'s',title:'Natal',productUrl:'https://meli.la/x',affiliateUrl:'https://meli.la/x',priceCents:1.1 }).success).toBe(false)
    const now = new Date('2026-10-28T12:00:00Z')
    expect(offerIsCurrent({status:'DRAFT',checkedAt:new Date('2026-10-26T12:00:00Z'),expiresAt:null},now)).toBe(false)
    expect(offerIsCurrent({status:'DRAFT',checkedAt:now,expiresAt:now},now)).toBe(false)
    expect(offerIsCurrent({status:'DRAFT',checkedAt:now,expiresAt:null},now)).toBe(true)
  })
})
