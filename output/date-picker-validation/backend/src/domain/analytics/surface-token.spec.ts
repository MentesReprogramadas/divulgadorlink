import { describe, expect, it } from 'vitest'
import { readSurface, signSurface } from '@/domain/analytics/surface-token'
import { surfaceFor } from '@/use-cases/@Analytics/record-event'

const SECRET = 'segredo-com-16-chars'

describe('surface token', () => {
  it('F03-U04 related stays distinct and all existing signed origins remain compatible', () => {
    for (const [origin, surface] of [['related', 'RELATED'], ['search', 'SEARCH'], ['home', 'HOME'], ['organic', 'ORGANIC'], ['network-home', 'NICHE'], ['niche-home', 'NICHE']] as const) {
      const token = signSurface('tenant-a', 'link-1', origin, SECRET)
      expect(readSurface('tenant-a', 'link-1', token, SECRET)).toBe(origin)
      expect(surfaceFor(origin)).toBe(surface)
      expect(readSurface('tenant-b', 'link-1', token, SECRET)).toBeNull()
    }
  })
  it('amarra tenant, link e origem e não carrega o segredo', () => {
    const token = signSurface('tenant-a', 'link-1', 'search', SECRET)
    expect(token).not.toContain(SECRET)
    expect(token.startsWith('search.')).toBe(true)
    expect(readSurface('tenant-a', 'link-1', token, SECRET)).toBe('search')
    expect(readSurface('tenant-b', 'link-1', token, SECRET)).toBeNull()
    expect(readSurface('tenant-a', 'link-2', token, SECRET)).toBeNull()
    expect(readSurface('tenant-a', 'link-1', token.replace('search.', 'home.'), SECRET)).toBeNull()
  })
})
