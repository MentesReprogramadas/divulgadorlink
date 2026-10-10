import { describe, expect, it } from 'vitest'
import { analyticsToPurge, purgeBefore, runAnalyticsPurge, type RetentionStore } from '@/use-cases/@Analytics/purge-old-events'

const now = new Date('2026-10-09T00:00:00.000Z')

describe('expurgo de analytics', () => {
  it('recua 12 meses e mantém o dia exato', () => {
    const before = purgeBefore(now)
    expect(before.toISOString().slice(0, 10)).toBe('2025-10-09')
    const events = [{ day: '2025-10-08' }, { day: '2025-10-09' }]
    expect(analyticsToPurge(events, before).map((row) => row.day)).toEqual(['2025-10-08'])
  })

  it('não apaga pedido passado no lugar do evento', () => {
    const orders = [{ id: 'order-1', createdAt: '2020-01-01' }]
    expect(analyticsToPurge(orders as Array<{ day: string }>, purgeBefore(now))).toEqual([])
  })

  it('apaga só o evento anterior ao corte e devolve a contagem', async () => {
    const rows = [
      { id: 'old', day: '2025-10-08' },
      { id: 'edge', day: '2025-10-09' },
    ]
    const store: RetentionStore = {
      async takeExpired(before, limit) {
        return analyticsToPurge(rows, before).slice(0, limit)
      },
      async deleteIds(ids) {
        for (const id of ids) {
          const index = rows.findIndex((row) => row.id === id)
          if (index >= 0) rows.splice(index, 1)
        }
      },
    }
    const deleted = await runAnalyticsPurge(store, now)
    expect(deleted).toBe(1)
    expect(rows.map((row) => row.id)).toEqual(['edge'])
  })
})
