import { describe, expect, it } from 'vitest'
import { exploreNetworks, exploreNiches, leadFirst, NETWORK_LEAD, NICHE_LEAD } from './facets'

describe('ordem dos facetas', () => {
  it('fixa telegram, discord e x na frente e mantém o filtro ativo logo depois', () => {
    const items = [
      { slug: 'instagram', requiresAge: false },
      { slug: 'onlyfans', requiresAge: true },
      { slug: 'x', requiresAge: false },
      { slug: 'telegram', requiresAge: false },
      { slug: 'discord', requiresAge: false },
    ]
    expect(leadFirst(items, NETWORK_LEAD, null).map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'onlyfans', 'instagram'])
    expect(leadFirst(items, NETWORK_LEAD, 'instagram').map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'instagram', 'onlyfans'])
  })

  it('fixa adulto, apostas e ganhar dinheiro na frente', () => {
    const items = [
      { slug: 'jogos', requiresAge: false },
      { slug: 'ganhar-dinheiro', requiresAge: false },
      { slug: 'adulto', requiresAge: true },
      { slug: 'apostas', requiresAge: false },
    ]
    expect(leadFirst(items, NICHE_LEAD, null).map((item) => item.slug)).toEqual(['adulto', 'apostas', 'ganhar-dinheiro', 'jogos'])
    expect(leadFirst(items, NICHE_LEAD, 'jogos').map((item) => item.slug)).toEqual(['adulto', 'apostas', 'ganhar-dinheiro', 'jogos'])
  })

  it('abre o explorar de redes por telegram, discord e x', () => {
    const items = [
      { slug: 'onlyfans', requiresAge: true },
      { slug: 'instagram', requiresAge: false },
      { slug: 'x', requiresAge: false },
      { slug: 'telegram', requiresAge: false },
      { slug: 'discord', requiresAge: false },
    ]
    const { lead, second } = exploreNetworks(items)
    expect(lead.map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'onlyfans'])
    expect(second.map((item) => item.slug)).toEqual(['instagram'])
  })

  it('abre o explorar de nichos por adulto, apostas e ganhar dinheiro', () => {
    const items = [
      { slug: 'ganhar-dinheiro', requiresAge: false },
      { slug: 'jogos', requiresAge: false },
      { slug: 'adulto', requiresAge: true },
      { slug: 'musicas', requiresAge: false },
      { slug: 'apostas', requiresAge: false },
    ]
    const { lead, mild } = exploreNiches(items)
    expect(lead.map((item) => item.slug)).toEqual(['adulto', 'apostas', 'ganhar-dinheiro'])
    expect(mild.map((item) => item.slug)).toEqual(['jogos', 'musicas'])
  })
})
