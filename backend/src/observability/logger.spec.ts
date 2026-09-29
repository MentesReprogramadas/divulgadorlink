import { describe, expect, it } from 'vitest'
import { sanitizeLog } from '@/observability/logger'

describe('logger', () => {
  it('remove segredo, código, e-mail e telefone', () => {
    expect(sanitizeLog({
      event: 'auth.confirm.failed',
      password: 'segredo',
      code: '123456',
      email: 'a@b.com',
      phone: '+5511999999999',
      request_id: 'req-1',
    })).toEqual({ event: 'auth.confirm.failed', request_id: 'req-1' })
  })
})
