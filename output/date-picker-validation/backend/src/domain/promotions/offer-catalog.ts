import { PRICE_ROWS, type PriceRow, type Surface } from '@/domain/promotions/price-for'

export const OFFER_CODES = ['SEARCH', 'NICHE', 'HOME', 'SEARCH_NICHE', 'SEARCH_NICHE_HOME'] as const

export type OfferCode = (typeof OFFER_CODES)[number]

export type OfferDraft = {
  code: OfferCode
  name: string
  sortOrder: number
  featured: boolean
}

export type CatalogOffer = OfferDraft & {
  surfaces: Surface[]
  prices: Array<{ durationDays: 7 | 14 | 28; amountCents: number }>
}

const DEFAULTS: OfferDraft[] = [
  { code: 'SEARCH', name: 'Busca', sortOrder: 10, featured: false },
  { code: 'NICHE', name: 'Nicho', sortOrder: 20, featured: false },
  { code: 'HOME', name: 'Home', sortOrder: 30, featured: false },
  { code: 'SEARCH_NICHE', name: 'Busca e nicho', sortOrder: 40, featured: true },
  { code: 'SEARCH_NICHE_HOME', name: 'Completo', sortOrder: 50, featured: false },
]

const SURFACES: Record<OfferCode, Surface[]> = {
  SEARCH: ['SEARCH'],
  NICHE: ['NICHE'],
  HOME: ['HOME'],
  SEARCH_NICHE: ['SEARCH', 'NICHE'],
  SEARCH_NICHE_HOME: ['SEARCH', 'NICHE', 'HOME'],
}

export function isOfferCode(value: string): value is OfferCode {
  return (OFFER_CODES as readonly string[]).includes(value)
}

export function surfacesFor(code: OfferCode): Surface[] {
  return SURFACES[code]
}

export function defaultOffers(): OfferDraft[] {
  return DEFAULTS.map((row) => ({ ...row }))
}

export function mergeCatalog(
  stored: OfferDraft[],
  prices: PriceRow[],
): CatalogOffer[] {
  const byCode = new Map(stored.map((row) => [row.code, row]))
  const featured = stored.length === 0
    ? DEFAULTS.find((row) => row.featured)?.code
    : stored.find((row) => row.featured)?.code
  return DEFAULTS.map((fallback) => {
    const row = byCode.get(fallback.code) ?? fallback
    return {
      code: fallback.code,
      name: row.name.trim() || fallback.name,
      sortOrder: row.sortOrder,
      featured: row.code === featured,
      surfaces: SURFACES[fallback.code],
      prices: ([7, 14, 28] as const).flatMap((durationDays) => {
        const price = prices.find((item) => item.code === fallback.code && item.durationDays === durationDays)
        return price ? [{ durationDays, amountCents: price.amountCents }] : []
      }),
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'))
}

export function priceRowsOrDefault(rows: PriceRow[]): PriceRow[] {
  return rows.length > 0 ? rows : PRICE_ROWS.map((row) => ({ ...row }))
}
