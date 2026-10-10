import { describe, expect, it } from 'vitest'
import { exploreNetworks, exploreNiches, leadFirst, NETWORK_LEAD, NICHE_LEAD, optionsForSubmit } from './facets'

describe('ordem dos facetas', () => {
  it('fixa telegram, discord e x na frente e mantém o filtro ativo logo depois', () => {
    const items = [
      { slug: 'instagram', requiresAge: false },
      { slug: 'onlyfans', requiresAge: true },
      { slug: 'x', requiresAge: false },
      { slug: 'telegram', requiresAge: false },
      { slug: 'discord', requiresAge: false },
    ]
    expect(leadFirst(items, NETWORK_LEAD, null).map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'instagram'])
    expect(leadFirst(items, NETWORK_LEAD, 'instagram').map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'instagram'])
    expect(leadFirst(items, NETWORK_LEAD, 'onlyfans').map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'onlyfans', 'instagram'])
  })

  it('tira adulto, apostas e ganhar dinheiro da fileira visível', () => {
    const items = [
      { slug: 'jogos', requiresAge: false },
      { slug: 'ganhar-dinheiro', requiresAge: false },
      { slug: 'adulto', requiresAge: true },
      { slug: 'apostas', requiresAge: false },
    ]
    expect(leadFirst(items, NICHE_LEAD, null).map((item) => item.slug)).toEqual(['jogos'])
    expect(leadFirst(items, NICHE_LEAD, 'apostas').map((item) => item.slug)).toEqual(['jogos', 'apostas'])
  })

  it('abre o explorar de redes por telegram, discord e x', () => {
    const items = [
      { slug: 'onlyfans', requiresAge: true },
      { slug: 'instagram', requiresAge: false },
      { slug: 'x', requiresAge: false },
      { slug: 'telegram', requiresAge: false },
      { slug: 'discord', requiresAge: false },
    ]
    const { lead, second, deferred } = exploreNetworks(items)
    expect(lead.map((item) => item.slug)).toEqual(['telegram', 'discord', 'x'])
    expect(second.map((item) => item.slug)).toEqual(['instagram'])
    expect(deferred.map((item) => item.slug)).toEqual(['onlyfans'])
  })

  it('guarda adulto, apostas e ganhar dinheiro para o ver mais', () => {
    const items = [
      { slug: 'ganhar-dinheiro', requiresAge: false },
      { slug: 'jogos', requiresAge: false },
      { slug: 'adulto', requiresAge: true },
      { slug: 'musicas', requiresAge: false },
      { slug: 'apostas', requiresAge: false },
    ]
    const { lead, mild, deferred } = exploreNiches(items)
    expect(lead.map((item) => item.slug)).toEqual([])
    expect(mild.map((item) => item.slug)).toEqual(['jogos', 'musicas'])
    expect(deferred.map((item) => item.slug)).toEqual(['adulto', 'apostas', 'ganhar-dinheiro'])
  })

  it('só inclui o nicho restrito no formulário depois do ver mais', () => {
    const items = [
      { id: 'jogos', slug: 'jogos' },
      { id: 'adulto', slug: 'adulto' },
      { id: 'fansly', slug: 'fansly' },
    ]
    expect(optionsForSubmit(items, '', false).map((item) => item.slug)).toEqual(['jogos'])
    expect(optionsForSubmit(items, 'adulto', false).map((item) => item.slug)).toEqual(['jogos', 'adulto'])
    expect(optionsForSubmit(items, '', true).map((item) => item.slug)).toEqual(['jogos', 'adulto', 'fansly'])
  })
})
