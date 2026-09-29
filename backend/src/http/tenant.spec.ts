import { describe, expect, it } from 'vitest'
import { resolveTenant } from '@/http/tenant'

describe('tenant', () => {
  it('resolve pelo host e ignora um tenantId que tenha vindo no corpo', async () => {
    const tenant = await resolveTenant('temlinkaqui.com', { tenantId: 'outro' })
    expect(tenant.id).not.toBe('outro')
    expect(tenant.id).toBeTruthy()
  })
})
