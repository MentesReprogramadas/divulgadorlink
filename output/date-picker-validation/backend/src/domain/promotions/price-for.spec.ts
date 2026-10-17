import { describe, expect, it } from 'vitest'
import { PRICE_ROWS, priceFor } from '@/domain/promotions/price-for'
import { readConfig } from '@/domain/config/read-config'

describe('preço', () => {
  it('não aceita SEARCH_HOME', () => {
    expect(() => priceFor(PRICE_ROWS, ['SEARCH', 'HOME'], 7)).toThrow(/não está disponível/)
  })

  it('devolve SEARCH_NICHE de 28 dias a 3990 e a economia contra a soma', () => {
    expect(priceFor(PRICE_ROWS, ['NICHE', 'SEARCH'], 28)).toEqual({
      code: 'SEARCH_NICHE',
      amountCents: 3990,
      savingsCents: 990,
    })
  })
})

describe('config', () => {
  it('lê a linha gravada e não inventa fallback', () => {
    expect(readConfig({ SEARCH_RELEVANCE_THRESHOLD: '0.1' }, 'SEARCH_RELEVANCE_THRESHOLD')).toBe(0.1)
    expect(() => readConfig({}, 'SEARCH_RELEVANCE_THRESHOLD')).toThrow(/config/)
  })
})
