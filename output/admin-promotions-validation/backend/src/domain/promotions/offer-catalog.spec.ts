import { describe, expect, it } from 'vitest'
import { mergeCatalog } from './offer-catalog'
import { PRICE_ROWS } from './price-for'

describe('catálogo de planos', () => {
  it('usa nome, ordem e um único destaque, com preço da tabela', () => {
    const offers = mergeCatalog(
      [
        { code: 'SEARCH', name: 'Na busca', sortOrder: 30, featured: false },
        { code: 'HOME', name: 'Na capa', sortOrder: 5, featured: true },
      ],
      PRICE_ROWS.map((row) => row.code === 'SEARCH' && row.durationDays === 7 ? { ...row, amountCents: 500 } : row),
    )
    expect(offers.map((row) => row.name)).toEqual(['Na capa', 'Nicho', 'Na busca', 'Busca e nicho', 'Completo'])
    expect(offers.filter((row) => row.featured).map((row) => row.code)).toEqual(['HOME'])
    expect(offers.find((row) => row.code === 'SEARCH')?.prices.find((price) => price.durationDays === 7)?.amountCents).toBe(500)
    expect(offers.find((row) => row.code === 'SEARCH_NICHE')?.surfaces).toEqual(['SEARCH', 'NICHE'])
  })
})
