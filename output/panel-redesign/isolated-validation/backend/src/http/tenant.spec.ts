import { describe, expect, it } from 'vitest'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

describe('tenant', () => {
  it('normaliza host público antes de consultar o tenant', async () => {
    expect(normalizeTenantHost('WWW.TemLinkAqui.com:443')).toBe('temlinkaqui.com')
    expect(normalizeTenantHost('links.temlinkaqui.com')).toBe('temlinkaqui.com')
    expect(normalizeTenantHost('www.outro.example')).toBe('www.outro.example')
    const tenant = await resolveTenant('www.temlinkaqui.com:443')
    expect(tenant.id).toBeTruthy()
  })

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
