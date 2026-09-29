export type Surface = 'SEARCH' | 'NICHE' | 'HOME'
export type ProductCode = 'SEARCH' | 'NICHE' | 'HOME' | 'SEARCH_NICHE' | 'SEARCH_NICHE_HOME'

export interface PriceRow {
  code: ProductCode
  durationDays: 7 | 14 | 28
  amountCents: number
}

const CODE_BY_KEY: Record<string, ProductCode> = {
  SEARCH: 'SEARCH',
  NICHE: 'NICHE',
  HOME: 'HOME',
  'NICHE+SEARCH': 'SEARCH_NICHE',
  'HOME+NICHE+SEARCH': 'SEARCH_NICHE_HOME',
}

export const PRICE_ROWS: PriceRow[] = [
  { code: 'SEARCH', durationDays: 7, amountCents: 790 },
  { code: 'SEARCH', durationDays: 14, amountCents: 1290 },
  { code: 'SEARCH', durationDays: 28, amountCents: 1990 },
  { code: 'NICHE', durationDays: 7, amountCents: 1190 },
  { code: 'NICHE', durationDays: 14, amountCents: 1990 },
  { code: 'NICHE', durationDays: 28, amountCents: 2990 },
  { code: 'HOME', durationDays: 7, amountCents: 1990 },
  { code: 'HOME', durationDays: 14, amountCents: 3490 },
  { code: 'HOME', durationDays: 28, amountCents: 4990 },
  { code: 'SEARCH_NICHE', durationDays: 7, amountCents: 1790 },
  { code: 'SEARCH_NICHE', durationDays: 14, amountCents: 2990 },
  { code: 'SEARCH_NICHE', durationDays: 28, amountCents: 3990 },
  { code: 'SEARCH_NICHE_HOME', durationDays: 7, amountCents: 3290 },
  { code: 'SEARCH_NICHE_HOME', durationDays: 14, amountCents: 5490 },
  { code: 'SEARCH_NICHE_HOME', durationDays: 28, amountCents: 6990 },
]

export function priceFor(rows: PriceRow[], surfaces: Surface[], durationDays: number) {
  const key = [...surfaces].sort().join('+')
  const code = CODE_BY_KEY[key]
  if (!code) throw new Error('Combinação não está disponível')
  const row = rows.find((item) => item.code === code && item.durationDays === durationDays)
  if (!row) throw new Error('Duração não está disponível')
  const singles = surfaces.reduce((sum, surface) => {
    const single = rows.find((item) => item.code === surface && item.durationDays === durationDays)
    return sum + (single?.amountCents ?? 0)
  }, 0)
  return { code, amountCents: row.amountCents, savingsCents: singles - row.amountCents }
}
