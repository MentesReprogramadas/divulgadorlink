import { analyticsDay, analyticsDayStart, shiftAnalyticsDay } from './day'
import { ctr } from './rates'

function validDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day + 'T00:00:00Z')) && new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) === day
}

export function performanceRange(query: { from?: string; to?: string }, now: Date) {
  const today = analyticsDay(now)
  const to = query.to ?? today
  const from = query.from ?? (validDay(to) ? shiftAnalyticsDay(to, -29) : '')
  if (!validDay(from) || !validDay(to) || from > to || to > today) throw new Error('Período inválido.')
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1
  if (days > 366) throw new Error('Selecione no máximo 366 dias.')
  const comparisonTo = shiftAnalyticsDay(from, -1)
  const comparisonFrom = shiftAnalyticsDay(from, -days)
  return { from, to, days, comparisonFrom, comparisonTo, start: analyticsDayStart(from), end: analyticsDayStart(shiftAnalyticsDay(to, 1)) }
}

export function performanceTotals(rows: Array<{ impressions: number; clicks: number }>, investmentCents: number | null) {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0)
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0)
  return { impressions, clicks, ctr: ctr(clicks, impressions), investmentCents, cpcCents: clicks > 0 && investmentCents !== null ? Math.round(investmentCents / clicks) : null }
}

export function allocateSurfaceCents(amount: number, surfaces: string[]): Record<string, number> {
  if (!Number.isSafeInteger(amount) || amount < 0 || !surfaces.length || new Set(surfaces).size !== surfaces.length || surfaces.some(s => !['HOME', 'NICHE', 'SEARCH'].includes(s))) throw new Error('Alocação inválida.')
  const ordered = [...surfaces].sort()
  const each = Math.floor(amount / ordered.length), remainder = amount % ordered.length
  return Object.fromEntries(ordered.map((surface, index) => [surface, each + (index < remainder ? 1 : 0)]))
}

export function proratedCents(amount: number, start: Date, end: Date, from: Date, to: Date): number {
  const duration = end.getTime() - start.getTime()
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(duration) || duration <= 0 || !Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) throw new Error('Rateio inválido.')
  const overlap = Math.max(0, Math.min(end.getTime(), to.getTime()) - Math.max(start.getTime(), from.getTime()))
  return Number((BigInt(amount) * BigInt(overlap) + BigInt(duration) / 2n) / BigInt(duration))
}
