import { describe, expect, it, vi } from 'vitest'
import { logJob, logSink, sanitizeLog } from '@/observability/logger'

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

  it('logJob registra fila, job, tentativa, duração e status sem segredo', () => {
    const spy = vi.spyOn(logSink, 'write').mockImplementation(() => {})
    try {
      logJob({ queue: 'q', job_id: 'charge-o1', name: 'charge-order', attempt: 2, duration_ms: 12, status: 'failure', error: 'TimeoutError', correlation_id: 'req-9' })
      const line = JSON.parse(String(spy.mock.calls.at(-1)?.[0]))
      expect(line).toMatchObject({
        event: 'job.completed', queue: 'q', job_id: 'charge-o1', name: 'charge-order',
        attempt: 2, duration_ms: 12, status: 'failure', error: 'TimeoutError', correlation_id: 'req-9',
      })
    } finally {
      spy.mockRestore()
    }
  })
})
