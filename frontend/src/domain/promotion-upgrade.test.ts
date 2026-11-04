import { describe, expect, it } from 'vitest'
import { findPromotionUpgrade } from './promotion-upgrade'

const catalog = [
  { code: 'SEARCH', surfaces: ['SEARCH'] as const, prices: [{ durationDays: 7, amountCents: 632 }] },
  { code: 'NICHE', surfaces: ['NICHE'] as const, prices: [{ durationDays: 7, amountCents: 952 }] },
  { code: 'HOME', surfaces: ['HOME'] as const, prices: [{ durationDays: 7, amountCents: 1592 }] },
  { code: 'SEARCH_NICHE', surfaces: ['SEARCH', 'NICHE'] as const, prices: [{ durationDays: 7, amountCents: 1432 }] },
  { code: 'SEARCH_NICHE_HOME', surfaces: ['SEARCH', 'NICHE', 'HOME'] as const, prices: [{ durationDays: 7, amountCents: 2632 }] },
]
describe('complementos do destaque', () => {
  it.each([
    ['SEARCH', ['NICHE', 'HOME'], 2000],
    ['NICHE', ['SEARCH', 'HOME'], 1680],
    ['HOME', ['SEARCH', 'NICHE'], 1040],
    ['SEARCH_NICHE', ['HOME'], 1200],
  ])('oferece somente os espaços ausentes em %s', (code, missing, additional) => {
    const result = findPromotionUpgrade(catalog.find(row => row.code === code), catalog, 7)
    expect(result?.missingSurfaces).toEqual(missing)
    expect(result?.additionalCents).toBe(additional)
    expect(result?.offer.code).toBe('SEARCH_NICHE_HOME')
  })
  it('Completo não recebe complemento', () => {
    expect(findPromotionUpgrade(catalog[4], catalog, 7)).toBeNull()
  })
  it('para +18 complementa apenas Busca e Nicho, sem Home nem Completo', () => {
    const adult = catalog.filter(row => !row.surfaces.some(surface => surface === 'HOME'))
    expect(findPromotionUpgrade(adult[0], adult, 7)?.missingSurfaces).toEqual(['NICHE'])
    expect(findPromotionUpgrade(adult[1], adult, 7)?.missingSurfaces).toEqual(['SEARCH'])
    expect(findPromotionUpgrade(adult[2], adult, 7)).toBeNull()
  })
  it('não inventa complemento se o preço da duração não está disponível', () => {
    expect(findPromotionUpgrade(catalog[0], catalog, 14)).toBeNull()
  })
})
