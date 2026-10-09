import { describe, expect, it } from 'vitest'
import { urlAvailability } from '@/domain/links/url-availability'

describe('vida da url', () => {
  it('trata bloqueio de rede social como viva e 404 como morta', () => {
    expect(urlAvailability(200)).toBe('alive')
    expect(urlAvailability(403)).toBe('alive')
    expect(urlAvailability(404)).toBe('dead')
    expect(urlAvailability(null)).toBe('dead')
  })
})
