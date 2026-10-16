import type { AnalyticsOrigin } from '@/domain/analytics/surface-token'
export function shouldCount(input: { viewer: 'OWNER' | 'ADMIN' | 'VISITOR'; duplicate: boolean }): boolean {
  if (input.viewer !== 'VISITOR') return false
  return !input.duplicate
}

export function surfaceFor(origin: AnalyticsOrigin): 'SEARCH' | 'NICHE' | 'HOME' | 'ORGANIC' | 'RELATED' {
  if (origin === 'niche-home' || origin === 'network-home') return 'NICHE'
  if (origin === 'search') return 'SEARCH'
  if (origin === 'related') return 'RELATED'
  if (origin === 'home') return 'HOME'
  return 'ORGANIC'
}

export { ctr } from '@/domain/analytics/rates'
