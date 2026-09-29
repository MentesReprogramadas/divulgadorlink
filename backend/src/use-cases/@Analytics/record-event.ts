export function shouldCount(input: { viewer: 'OWNER' | 'ADMIN' | 'VISITOR'; duplicate: boolean }): boolean {
  if (input.viewer !== 'VISITOR') return false
  return !input.duplicate
}

export function surfaceFor(origin: 'search' | 'niche-home' | 'network-home' | 'home' | 'organic'): 'SEARCH' | 'NICHE' | 'HOME' | 'ORGANIC' {
  if (origin === 'niche-home' || origin === 'network-home') return 'NICHE'
  if (origin === 'search') return 'SEARCH'
  if (origin === 'home') return 'HOME'
  return 'ORGANIC'
}

export function ctr(clicks: number, impressions: number): number {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}
