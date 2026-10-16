import { ctr, shouldCount, surfaceFor } from '@/use-cases/@Analytics/record-event'
import type { AnalyticsOrigin } from '@/domain/analytics/surface-token'
import type { AnalyticsKind, AnalyticsRepository } from '@/repositories/analytics-repository'
import { logDomainEvent } from '@/observability/logger'

import { analyticsDay } from '@/domain/analytics/day'
export { analyticsDay } from '@/domain/analytics/day'

export async function persistAnalyticsEvent(input: {
  viewer: 'OWNER' | 'ADMIN' | 'VISITOR'
  origin: AnalyticsOrigin
  tenantId: string
  linkId: string
  sessionId: string
  kind: AnalyticsKind
  now: Date
  requestId: string
  repository: AnalyticsRepository
}): Promise<{ counted: boolean; surface: ReturnType<typeof surfaceFor> }> {
  const surface = surfaceFor(input.origin)
  if (!shouldCount({ viewer: input.viewer, duplicate: false })) {
    logDomainEvent('analytics.skipped', {
      requestId: input.requestId,
      tenantId: input.tenantId,
      linkId: input.linkId,
      kind: input.kind,
      surface,
    })
    return { counted: false, surface }
  }

  const result = await input.repository.insert({
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    linkId: input.linkId,
    surface,
    day: analyticsDay(input.now),
    kind: input.kind,
  })
  const counted = shouldCount({ viewer: input.viewer, duplicate: result === 'duplicate' })
  logDomainEvent(counted ? 'analytics.recorded' : 'analytics.duplicate', {
    requestId: input.requestId,
    tenantId: input.tenantId,
    linkId: input.linkId,
    kind: input.kind,
    surface,
  })
  return { counted, surface }
}

export async function readAnalytics(input: {
  tenantId: string
  linkId: string
  from?: string
  to?: string
  repository: AnalyticsRepository
}): Promise<{ linkId: string; tenantId: string; from: string | null; to: string | null; impressions: number; clicks: number; ctr: number }> {
  const totals = await input.repository.totals({
    tenantId: input.tenantId,
    linkId: input.linkId,
    from: input.from,
    to: input.to,
  })
  return {
    linkId: input.linkId,
    tenantId: input.tenantId,
    from: input.from ?? null,
    to: input.to ?? null,
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr: ctr(totals.clicks, totals.impressions),
  }
}
