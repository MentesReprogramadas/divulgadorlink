import { describe, expect, it } from 'vitest'
import { authorize } from '@/http/authorize'
import { authorizeDenialCode, buildError, not_found } from '@/http/errors'

describe('autorização', () => {
  it('nega outro dono e outro tenant', () => {
    expect(authorize({
      actorId: 'u1', tenantId: 't1', ownerId: 'u2', resourceTenantId: 't1', role: 'USER', action: 'link.update',
    })).toBe(false)
    expect(authorize({
      actorId: 'u1', tenantId: 't1', ownerId: 'u1', resourceTenantId: 't2', role: 'ADMIN', action: 'link.update',
    })).toBe(false)
  })

  it('admin do próprio tenant altera link do tenant', () => {
    expect(authorize({
      actorId: 'admin', tenantId: 't1', ownerId: 'u2', resourceTenantId: 't1', role: 'ADMIN', action: 'link.update',
    })).toBe(true)
  })

  it('dono do mesmo tenant lança ao mapear negação', () => {
    expect(() => authorizeDenialCode({
      actorId: 'u1', tenantId: 't1', ownerId: 'u1', resourceTenantId: 't1', role: 'USER', action: 'link.update',
    })).toThrow('acesso permitido')
  })

  it('recurso de outro usuário no mesmo tenant responde not_found, não forbidden', () => {
    expect(authorizeDenialCode({
      actorId: 'u1', tenantId: 't1', ownerId: 'u2', resourceTenantId: 't1', role: 'USER', action: 'link.update',
    })).toBe('not_found')
    expect(authorizeDenialCode({
      actorId: 'u1', tenantId: 't1', ownerId: 'u1', resourceTenantId: 't2', role: 'ADMIN', action: 'link.update',
    })).toBe('forbidden')
  })
})

describe('contrato de erro', () => {
  it('monta corpo sem stack', () => {
    const body = buildError({
      code: not_found,
      message: 'Recurso não encontrado.',
      request_id: 'req-1',
    })
    expect(body).toEqual({
      code: 'not_found',
      message: 'Recurso não encontrado.',
      request_id: 'req-1',
    })
    expect(body).not.toHaveProperty('stack')
  })
})
