import { describe, expect, it } from 'vitest'
import { banAccount } from '@/use-cases/@Admin/ban-account'

describe('banimento', () => {
  it('tira os links e cancela o destaque sem estornar', () => {
    const result = banAccount({
      links: [{ id: 'l1', status: 'PUBLISHED' }],
      promotions: [{ id: 'p1', status: 'ACTIVE' }],
    })
    expect(result.userStatus).toBe('BANNED')
    expect(result.links[0].status).toBe('UNAVAILABLE')
    expect(result.promotions[0].status).toBe('CANCELLED')
    expect(result.refunds).toEqual([])
  })

  it('tira também o rascunho pela transição', () => {
    const result = banAccount({
      links: [{ id: 'l2', status: 'DRAFT' }],
      promotions: [],
    })
    expect(result.links[0].status).toBe('UNAVAILABLE')
  })
})
