import { describe, expect, it } from 'vitest'
import { resolveTenant } from '@/http/tenant'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

describe('tenant', () => {
  it('resolve pelo host e ignora um tenantId que tenha vindo no corpo', async () => {
    const tenant = await resolveTenant('temlinkaqui.com', { tenantId: 'outro' })
    expect(tenant.id).not.toBe('outro')
    expect(tenant.id).toBeTruthy()
  })

  it('host desconhecido lança ResourceNotFoundError', async () => {
    await expect(resolveTenant('desconhecido.example')).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    )
  })
})
