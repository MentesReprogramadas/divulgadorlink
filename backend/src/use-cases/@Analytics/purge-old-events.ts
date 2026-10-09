export function purgeBefore(now: Date): Date {
  const copy = new Date(now.getTime())
  copy.setUTCMonth(copy.getUTCMonth() - 12)
  return copy
}

export function analyticsToPurge<T extends { day: string }>(events: T[], before: Date): T[] {
  const cutoff = before.toISOString().slice(0, 10)
  return events.filter((event) => typeof event.day === 'string' && event.day < cutoff)
}
