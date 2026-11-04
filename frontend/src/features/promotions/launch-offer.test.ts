import { describe, expect, it } from 'vitest'
import { offerSecondsRemaining } from './launch-offer'

describe('prazo da oferta de destaque', () => {
  it('usa o prazo absoluto e não reinicia ao reabrir', () => {
    const end = '2026-11-03T18:00:00Z'
    expect(offerSecondsRemaining(end, Date.parse('2026-11-03T17:59:00Z'))).toBe(60)
    expect(offerSecondsRemaining(end, Date.parse('2026-11-03T17:59:45Z'))).toBe(15)
    expect(offerSecondsRemaining(end, Date.parse('2026-11-03T18:00:01Z'))).toBe(0)
  })
  it('não apresenta promoção com prazo inválido', () => {
    expect(offerSecondsRemaining('inválido', 0)).toBe(0)
  })
})
