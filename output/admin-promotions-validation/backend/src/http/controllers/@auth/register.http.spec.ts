import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import {
  registrationEmailsForTest,
  resetRegistrationForTest,
  setConfirmationDeliveryForTest,
} from '@/http/controllers/@auth/routes'

const HOST = 'temlinkaqui.com'

describe('POST /api/v1/auth/register', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetRegistrationForTest()
  })

  it('cria a conta sem telefone', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: { host: HOST },
      payload: { name: 'Ana', email: 'ana-sem-fone@example.com', password: 'senha1234' },
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().user.canSubmitLink).toBe(false)
  })

  it('apaga a conta quando o código não sai', async () => {
    setConfirmationDeliveryForTest('down')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: { host: HOST },
      payload: { name: 'Ana', email: 'ana-sem-codigo@example.com', password: 'senha1234' },
    })
    expect(response.statusCode).toBe(503)
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(registrationEmailsForTest()).not.toContain('ana-sem-codigo@example.com')
  })
})
