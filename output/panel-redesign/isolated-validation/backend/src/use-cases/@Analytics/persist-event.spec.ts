import { describe, expect, it } from 'vitest'
import { RecordingAnalyticsRepository } from '@/repositories/analytics-repository'
import { analyticsDay, readAnalytics } from '@/use-cases/@Analytics/persist-event'

describe('dia da métrica', () => {
  it('usa o dia de São Paulo, não o dia UTC', () => {
    expect(analyticsDay(new Date('2026-10-02T02:30:00.000Z'))).toBe('2026-10-01')
    expect(analyticsDay(new Date('2026-10-02T15:00:00.000Z'))).toBe('2026-10-02')
  })

  it('sem período soma o histórico inteiro', async () => {
    const repository = new RecordingAnalyticsRepository()
    await repository.insert({
      tenantId: 't', sessionId: 's', linkId: 'l', surface: 'HOME', day: '2026-09-01', kind: 'IMPRESSION',
    })
    await repository.insert({
      tenantId: 't', sessionId: 's', linkId: 'l', surface: 'HOME', day: '2026-10-02', kind: 'CLICK',
    })
    const stats = await readAnalytics({ tenantId: 't', linkId: 'l', repository })
    expect(stats.impressions).toBe(1)
    expect(stats.clicks).toBe(1)
    expect(stats.from).toBeNull()
    expect(stats.ctr).toBe(100)
    const day = await readAnalytics({ tenantId: 't', linkId: 'l', from: '2026-10-02', to: '2026-10-02', repository })
    expect(day.impressions).toBe(0)
    expect(day.clicks).toBe(1)
  })
})
