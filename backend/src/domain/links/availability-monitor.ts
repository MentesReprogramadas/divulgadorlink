export type AvailabilityState = 'UNKNOWN' | 'ACCESSIBLE' | 'SUSPECT' | 'INCONCLUSIVE' | 'UNAVAILABLE'
export type MonitorPolicy = { enabled: boolean; intervalMs: number; failureThreshold: number; retryMs: number; hostIntervalMs: number }
export function monitorPolicy(values: Record<string, string | undefined>): MonitorPolicy {
  const enabled = values.AVAILABILITY_ENABLED ?? '0'
  if (!['0', '1'].includes(enabled)) throw new Error('AVAILABILITY_ENABLED inválida')
  function integer(key: string, fallback: number, min: number, max: number): number {
    const value = Number(values[key] ?? fallback)
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(key + ' inválida')
    return value
  }
  return { enabled: enabled === '1', intervalMs: integer('AVAILABILITY_INTERVAL_MINUTES', 360, 5, 10080) * 60000, failureThreshold: integer('AVAILABILITY_FAILURE_THRESHOLD', 3, 2, 10), retryMs: integer('AVAILABILITY_RETRY_MINUTES', 30, 5, 360) * 60000, hostIntervalMs: integer('AVAILABILITY_HOST_INTERVAL_SECONDS', 60, 1, 3600) * 1000 }
}
export function observeAvailability(current: { failures: number; automaticallyUnavailable: boolean }, status: number | null, now: Date, policy: MonitorPolicy): { state: AvailabilityState; failures: number; withdraw: boolean; nextCheckAt: Date } {
  const accessible = status !== null && status >= 200 && status < 300
  const failure = status === null || status === 404 || status === 410 || (status >= 500 && status <= 599)
  const failures = failure ? Math.min(current.failures + 1, policy.failureThreshold) : 0
  const withdraw = !current.automaticallyUnavailable && failure && failures >= policy.failureThreshold
  const state: AvailabilityState = current.automaticallyUnavailable || withdraw ? 'UNAVAILABLE' : accessible ? 'ACCESSIBLE' : failure ? 'SUSPECT' : 'INCONCLUSIVE'
  const delay = failure && !withdraw && !current.automaticallyUnavailable ? Math.min(policy.intervalMs, policy.retryMs * 2 ** (failures - 1)) : policy.intervalMs
  return { state, failures, withdraw, nextCheckAt: new Date(now.getTime() + delay) }
}
