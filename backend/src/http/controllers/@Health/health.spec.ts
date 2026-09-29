import { describe, expect, it } from 'vitest'
import { app } from '@/app'

describe('health', () => {
  it('responde ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/actuator/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
