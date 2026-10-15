import { describe, expect, it } from 'vitest'
import { readSurface, signSurface } from '@/domain/analytics/surface-token'

const SECRET = 'segredo-com-16-chars'

describe('surface token', () => {
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
