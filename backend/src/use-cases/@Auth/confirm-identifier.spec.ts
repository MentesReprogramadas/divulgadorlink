import { describe, expect, it } from 'vitest'
import { canSubmitLink, assertResendAllowed } from '@/use-cases/@Auth/confirm-identifier'

describe('confirmação', () => {
  it('bloqueia envio sem os dois identificadores confirmados', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: false, status: 'ACTIVE',
    })).toBe(false)
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'ACTIVE',
    })).toBe(true)
  })

  it('bloqueia conta banida', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'BANNED',
    })).toBe(false)
  })

  it('para no sexto reenvio da janela', () => {
    expect(() => assertResendAllowed(5)).toThrow(/limite/)
    expect(assertResendAllowed(4)).toBe(true)
  })
})
