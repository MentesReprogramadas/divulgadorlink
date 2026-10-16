import { analyticsDay, analyticsDayStart, shiftAnalyticsDay } from '@/domain/analytics/day'
import { performanceRange, performanceTotals } from '@/domain/analytics/performance'
import { activeServiceWindows, investmentConsumedCents, investmentServiceWindows, type PaidTimePause } from '@/domain/promotions/paid-time'
import { purgeBefore } from './purge-old-events'

export type PerformanceSeriesRow = { day: string; surface: string; impressions: number; clicks: number; paidClicks: number }
export type PerformanceCampaign = {
  id: string; surface: string; status: string; activatedAt: Date; expiresAt: Date | null; administrative: boolean;
  investments: Array<{ amountCents: number; startsAt: Date; endsAt: Date; pauseRevision?: number }>;
  pauses?: PaidTimePause[];
}
export type PerformanceQuery = ReturnType<typeof performanceRange> & { tenantId: string; linkId: string; promotionId?: string; now: Date }
export interface PromotionPerformanceRepository {
  authorizedLink(tenantId: string, linkId: string, actorId: string): Promise<{ id: string; name: string } | null>
  read(query: PerformanceQuery): Promise<{ rows: PerformanceSeriesRow[]; campaigns: PerformanceCampaign[] }>
}

function covered(start: number, end: number, intervals: Array<{ startsAt: Date; endsAt: Date }>): boolean {
  let cursor = start
  for (const row of [...intervals].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    if (row.endsAt.getTime() <= cursor) continue
    if (row.startsAt.getTime() > cursor) return false
    cursor = Math.max(cursor, row.endsAt.getTime())
    if (cursor >= end) return true
  }
  return cursor >= end
}

export async function promotionPerformance(input: {
  tenantId: string; linkId: string; actorId: string; from?: string; to?: string; promotionId?: string;
}, repository: PromotionPerformanceRepository, now = new Date()) {
  const link = await repository.authorizedLink(input.tenantId, input.linkId, input.actorId)
  if (!link) return null
  const range = performanceRange(input, now)
  const raw = await repository.read({ ...range, tenantId: input.tenantId, linkId: input.linkId, promotionId: input.promotionId, now })
  const selected = input.promotionId ? raw.campaigns.find(row => row.id === input.promotionId) : null
  if (input.promotionId && !selected) return null
  const campaigns = selected ? [selected] : raw.campaigns
  const end = new Date(Math.min(range.end.getTime(), now.getTime()))
  const current = raw.rows.filter(row => row.day >= range.from && row.day <= range.to)
  const previous = raw.rows.filter(row => row.day >= range.comparisonFrom && row.day <= range.comparisonTo)
  const cutoff = purgeBefore(now).toISOString().slice(0, 10)
  const coverage = range.to < cutoff ? 'UNAVAILABLE' : range.from < cutoff ? 'PARTIAL' : 'COMPLETE'
  const paid = campaigns.filter(row => !row.administrative && row.activatedAt < end && (!row.expiresAt || row.expiresAt > range.start))
  const windows = (row: PerformanceCampaign) => activeServiceWindows(row.activatedAt, new Date(Math.min(end.getTime(), row.expiresAt?.getTime() ?? end.getTime())), row.pauses ?? [])
  const moneyKnown = paid.every(row => windows(row).every(window => covered(Math.max(range.start.getTime(), window.startsAt.getTime()), window.endsAt.getTime(), row.investments.flatMap(item => investmentServiceWindows({ ...item, pauseRevision: item.pauseRevision ?? 0 }, row.pauses ?? [])))))
  const investmentCents = moneyKnown ? campaigns.reduce((sum, row) => sum + row.investments.reduce((amount, item) => amount + investmentConsumedCents({ ...item, pauseRevision: item.pauseRevision ?? 0 }, row.pauses ?? [], range.start, end), 0), 0) : null
  const totals = performanceTotals(current, investmentCents)
  const paidClicks = current.reduce((sum, row) => sum + row.paidClicks, 0)
  totals.cpcCents = coverage === 'COMPLETE' && investmentCents !== null && paidClicks > 0 ? Math.round(investmentCents / paidClicks) : null
  const daily = []
  for (let day = range.from; day <= range.to; day = shiftAnalyticsDay(day, 1)) {
    const rows = current.filter(row => row.day === day)
    daily.push({ day, available: day >= cutoff, ...performanceTotals(rows, null), paidClicks: rows.reduce((sum, row) => sum + row.paidClicks, 0), highlighted: campaigns.some(row => windows(row).some(window => window.startsAt < analyticsDayStart(shiftAnalyticsDay(day, 1)) && window.endsAt > analyticsDayStart(day))) })
  }
  return {
    link, from: range.from, to: range.to, days: range.days, promotionId: input.promotionId ?? null,
    series: current, daily, totals: { ...totals, paidClicks },
    surfaces: ['HOME', 'SEARCH', 'NICHE', 'ORGANIC'].map(surface => ({ surface, ...performanceTotals(current.filter(row => row.surface === surface), null) })),
    coverage: { status: coverage, availableFrom: cutoff, investment: moneyKnown ? 'COMPLETE' : 'UNLINKED_HISTORY', currentDayPartial: range.to === analyticsDay(now) },
    dataState: coverage === 'UNAVAILABLE' ? 'OUTSIDE_RETENTION' : current.some(row => row.impressions || row.clicks) ? 'RECORDED' : 'NO_EVENTS',
    comparison: { from: range.comparisonFrom, to: range.comparisonTo, days: range.days, totals: performanceTotals(previous, null), coverage: range.comparisonTo < cutoff ? 'UNAVAILABLE' : range.comparisonFrom < cutoff ? 'PARTIAL' : 'COMPLETE' },
    campaigns: raw.campaigns.map(row => ({ id: row.id, surface: row.surface, status: row.status, activatedAt: row.activatedAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null, administrative: row.administrative })),
    methodology: { attribution: 'OBSERVED_DURING_PROMOTION', deduplication: 'session/link/surface/day/kind', investment: 'equal_surface_allocation_time_prorated', timezone: 'America/Sao_Paulo' },
  }
}
