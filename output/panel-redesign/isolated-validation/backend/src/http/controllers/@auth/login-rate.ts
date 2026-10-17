const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 5

export function createLoginRateLimiter(now: () => number = Date.now) {
  const attempts = new Map<string, number[]>()

  function recent(key: string): number[] {
    const at = now()
    const kept = (attempts.get(key) ?? []).filter((stamp) => at - stamp < WINDOW_MS)
    if (kept.length === 0) attempts.delete(key)
    else attempts.set(key, kept)
    return kept
  }

  return {
    limited(key: string): boolean {
      return recent(key).length >= LIMIT
    },
    fail(key: string): void {
      const kept = recent(key)
      kept.push(now())
      attempts.set(key, kept)
    },
    succeed(key: string): void {
      attempts.delete(key)
    },
    reset(): void {
      attempts.clear()
    },
  }
}
