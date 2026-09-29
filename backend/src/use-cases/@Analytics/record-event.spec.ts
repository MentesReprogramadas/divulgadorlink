import { describe, expect, it } from 'vitest'
import { ctr, shouldCount, surfaceFor } from '@/use-cases/@Analytics/record-event'

describe('analytics', () => {
  it('não conta dono, admin nem repetição', () => {
    expect(shouldCount({ viewer: 'OWNER', duplicate: false })).toBe(false)
    expect(shouldCount({ viewer: 'ADMIN', duplicate: false })).toBe(false)
    expect(shouldCount({ viewer: 'VISITOR', duplicate: true })).toBe(false)
    expect(shouldCount({ viewer: 'VISITOR', duplicate: false })).toBe(true)
  })

  it('home de rede é superfície NICHE', () => {
    expect(surfaceFor('network-home')).toBe('NICHE')
    expect(surfaceFor('niche-home')).toBe('NICHE')
  })

  it('CTR usa a mesma chave', () => {
    expect(ctr(1, 4)).toBe(25)
  })
})
