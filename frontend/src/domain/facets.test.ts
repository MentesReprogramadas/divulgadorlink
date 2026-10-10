import { describe, expect, it } from 'vitest'
import { exploreNetworks, exploreNiches, leadFirst, NETWORK_LEAD, NICHE_LEAD, spreadFacets } from './facets'

describe('ordem dos facetas', () => {
  it('fixa telegram, discord e x na frente e espalha onlyfans no resto', () => {
    const items = [
      { slug: 'instagram', requiresAge: false },
      { slug: 'onlyfans', requiresAge: true },
      { slug: 'x', requiresAge: false },
      { slug: 'telegram', requiresAge: false },
      { slug: 'discord', requiresAge: false },
    ]
    expect(leadFirst(items, NETWORK_LEAD, null).map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'instagram', 'onlyfans'])
    expect(leadFirst(items, NETWORK_LEAD, 'instagram').map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'instagram', 'onlyfans'])
    expect(leadFirst(items, NETWORK_LEAD, 'onlyfans').map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'onlyfans', 'instagram'])
  })

  it('não abre a fileira de nichos por adulto, apostas ou ganhar dinheiro', () => {
    const items = [
      { slug: 'compras', requiresAge: false },
      { slug: 'jogos', requiresAge: false },
      { slug: 'ganhar-dinheiro', requiresAge: false },
      { slug: 'divulgacao', requiresAge: false },
      { slug: 'adulto', requiresAge: true },
      { slug: 'streaming', requiresAge: false },
      { slug: 'apostas', requiresAge: false },
    ]
    const slugs = leadFirst(items, NICHE_LEAD, null).map((item) => item.slug)
    expect(slugs[0]).toBe('jogos')
    expect(slugs.slice(0, 3)).not.toEqual(['adulto', 'apostas', 'ganhar-dinheiro'])
    expect(slugs).toContain('adulto')
    expect(slugs).toContain('apostas')
    expect(slugs).toContain('ganhar-dinheiro')
  })

  it('abre o explorar de redes por telegram, discord e x', () => {
    const items = [
      { slug: 'onlyfans', requiresAge: true },
      { slug: 'instagram', requiresAge: false },
      { slug: 'kwai', requiresAge: false },
      { slug: 'x', requiresAge: false },
      { slug: 'telegram', requiresAge: false },
      { slug: 'discord', requiresAge: false },
    ]
    const { lead, second } = exploreNetworks(items)
    expect(lead.map((item) => item.slug)).toEqual(['telegram', 'discord', 'x', 'kwai', 'onlyfans'])
    expect(second.map((item) => item.slug)).toEqual(['instagram'])
  })

  it('espalha adulto, apostas e ganhar dinheiro entre os outros nichos', () => {
    const items = [
      { slug: 'ganhar-dinheiro', requiresAge: false },
      { slug: 'jogos', requiresAge: false },
      { slug: 'compras', requiresAge: false },
      { slug: 'adulto', requiresAge: true },
      { slug: 'musicas', requiresAge: false },
      { slug: 'divulgacao', requiresAge: false },
      { slug: 'apostas', requiresAge: false },
      { slug: 'streaming', requiresAge: false },
    ]
    const { lead, mild } = exploreNiches(items)
    expect(mild.map((item) => item.slug)).toEqual(['jogos', 'musicas'])
    expect(lead.map((item) => item.slug)).toEqual(['compras', 'ganhar-dinheiro', 'divulgacao', 'adulto', 'streaming', 'apostas'])
  })

  it('espalha o nicho restrito no formulário sem esconder', () => {
    const items = [
      { id: 'adulto', slug: 'adulto' },
      { id: 'jogos', slug: 'jogos' },
      { id: 'compras', slug: 'compras' },
      { id: 'fansly', slug: 'fansly' },
    ]
    expect(spreadFacets(items).map((item) => item.slug)).toEqual(['jogos', 'adulto', 'compras', 'fansly'])
  })
})
