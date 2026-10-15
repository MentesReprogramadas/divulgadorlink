import { describe, expect, it } from 'vitest'
import { banReasonOf } from './ban-reason'

describe('motivo da suspensão', () => {
  it('lê só o texto gravado na auditoria', () => {
    expect(banReasonOf({ status: 'BANNED', reason: ' golpe ' })).toBe('golpe')
    expect(banReasonOf({ reason: '   ' })).toBeNull()
    expect(banReasonOf({ reason: 1 })).toBeNull()
    expect(banReasonOf(null)).toBeNull()
    expect(banReasonOf(['golpe'])).toBeNull()
  })
})
