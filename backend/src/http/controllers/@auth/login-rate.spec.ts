import { describe, expect, it } from 'vitest'
import { createLoginRateLimiter } from './login-rate'

describe('limite de login', () => {
  it('não trava logins certos', () => {
    let clock = 0
    const rate = createLoginRateLimiter(() => clock)
    for (let i = 0; i < 6; i += 1) {
      expect(rate.limited('localhost:dono@demo.local')).toBe(false)
      rate.succeed('localhost:dono@demo.local')
      clock += 1000
    }
  })

  it('trava na sexta senha errada e solta quando uma acerta', () => {
    let clock = 0
    const rate = createLoginRateLimiter(() => clock)
    const key = 'localhost:dono@demo.local'
    for (let i = 0; i < 5; i += 1) {
      expect(rate.limited(key)).toBe(false)
      rate.fail(key)
      clock += 1000
    }
    expect(rate.limited(key)).toBe(true)
    rate.succeed(key)
    expect(rate.limited(key)).toBe(false)
  })

  it('esquece a falha depois de uma hora', () => {
    let clock = 0
    const rate = createLoginRateLimiter(() => clock)
    const key = 'localhost:dono@demo.local'
    for (let i = 0; i < 5; i += 1) rate.fail(key)
    expect(rate.limited(key)).toBe(true)
    clock += 60 * 60 * 1000
    expect(rate.limited(key)).toBe(false)
  })
})
