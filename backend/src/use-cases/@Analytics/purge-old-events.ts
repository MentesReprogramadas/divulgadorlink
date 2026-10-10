export function purgeBefore(now: Date): Date {
  const copy = new Date(now.getTime())
  copy.setUTCMonth(copy.getUTCMonth() - 12)
  return copy
}

export function cutoffInstant(now: Date): Date {
  return new Date(`${purgeBefore(now).toISOString().slice(0, 10)}T00:00:00.000Z`)
}

export function analyticsToPurge<T extends { day: string }>(events: T[], before: Date): T[] {
  const cutoff = before.toISOString().slice(0, 10)
  return events.filter((event) => typeof event.day === 'string' && event.day < cutoff)
}

export type RetentionEvent = { id: string; day: string }

export type RetentionStore = {
  takeExpired(before: Date, limit: number): Promise<RetentionEvent[]>
  deleteIds(ids: string[]): Promise<void>
}

const BATCH = 1000
const MAX_BATCHES = 100

export async function runAnalyticsPurge(store: RetentionStore, now: Date): Promise<number> {
  const before = purgeBefore(now)
  let deleted = 0
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const rows = await store.takeExpired(before, BATCH)
    const doomed = analyticsToPurge(rows, before)
    if (doomed.length === 0) return deleted
    await store.deleteIds(doomed.map((row) => row.id))
    deleted += doomed.length
    if (rows.length < BATCH) return deleted
  }
  return deleted
}
