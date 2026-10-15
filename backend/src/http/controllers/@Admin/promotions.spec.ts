import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { getLinksRepository, InMemoryLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { getAuditLogsRepository, InMemoryAuditLogsRepository, resetAuditLogsRepositoryForTest } from '@/repositories/audit-logs-repository'
import { getCheckoutStore, resetCheckoutStoreForTest } from '@/use-cases/@Promotions/checkout-store'

const tenantId = 'seed-temlinkaqui'
function repo() { return getLinksRepository() as InMemoryLinksRepository }
function token(sub = 'admin', role = 'ADMIN', tenant = tenantId) { return app.jwt.sign({ sub, role, tenantId: tenant, typ: 'access' }) }
function call(method: 'GET' | 'PUT' | 'DELETE', payload?: object, id = 'link', access = token()) {
  return app.inject({ method, url: `/api/v1/admin/links/${id}/promotions`, headers: { host: 'temlinkaqui.com', authorization: `Bearer ${access}` }, ...(payload ? { payload } : {}) })
}
describe('destaques administrativos', () => {
  beforeAll(async () => { await app.ready() })
  beforeEach(() => {
    resetLinksRepositoryForTest(); resetCheckoutStoreForTest(); resetAuditLogsRepositoryForTest()
    for (const id of ['admin', 'owner']) repo().addUser({ id, tenantId, role: id === 'admin' ? 'ADMIN' : 'USER', status: 'ACTIVE', identifiers: [] })
    repo().addLink({ id: 'link', tenantId, ownerId: 'owner', name: 'Comunidade', status: 'PUBLISHED' })
  })
  it('salva período, altera para indeterminado, preserva ativação e remove com auditoria', async () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString()
    expect((await call('PUT', { surfaces: ['SEARCH', 'NICHE'], expiresAt })).statusCode).toBe(200)
    const before = (await call('GET')).json().promotions
    expect(before).toHaveLength(2)
    expect(before[0].expiresAt).toBe(expiresAt)
    expect((await call('PUT', { surfaces: ['SEARCH', 'NICHE'], expiresAt: null })).statusCode).toBe(200)
    const after = (await call('GET')).json().promotions
    expect(after).toHaveLength(2); expect(after[0].expiresAt).toBeNull()
    expect(after[0].activatedAt).toBe(before[0].activatedAt)
    expect((await call('DELETE')).statusCode).toBe(200)
    expect((await call('GET')).json().promotions).toEqual([])
    expect((getAuditLogsRepository() as InMemoryAuditLogsRepository).items).toHaveLength(3)
    expect(getCheckoutStore().orders).toEqual([])
  })
  it('protege autenticação, papel real e tenant', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/admin/links/link/promotions', headers: { host: 'temlinkaqui.com' } })).statusCode).toBe(401)
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null }, 'link', token('owner', 'USER'))).statusCode).toBe(404)
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null }, 'link', token('owner', 'ADMIN'))).statusCode).toBe(404)
    expect((await call('GET', undefined, 'link', token('admin', 'ADMIN', 'other'))).statusCode).toBe(403)
    repo().addLink({ id: 'foreign', tenantId: 'other', status: 'PUBLISHED' })
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null }, 'foreign')).statusCode).toBe(404)
    repo().users.find(row => row.id === 'admin')!.status = 'BANNED'
    expect((await call('DELETE')).statusCode).toBe(404)
  })
  it('recusa datas passadas, locais duplicados e combinações indisponíveis', async () => {
    for (const payload of [
      { surfaces: ['SEARCH'], expiresAt: '2020-01-01T00:00:00Z' },
      { surfaces: ['SEARCH'], expiresAt: 'inválida' },
      { surfaces: ['SEARCH', 'SEARCH'], expiresAt: null },
      { surfaces: ['SEARCH', 'HOME'], expiresAt: null },
    ]) expect((await call('PUT', payload)).statusCode).toBe(400)
  })
  it('não publica pendências, não destaca conta suspensa e respeita restrição de idade', async () => {
    repo().links[0]!.status = 'PENDING_MODERATION'
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null })).statusCode).toBe(409)
    repo().links[0]!.status = 'PUBLISHED'
    repo().users.find(row => row.id === 'owner')!.status = 'BANNED'
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null })).statusCode).toBe(409)
    repo().users.find(row => row.id === 'owner')!.status = 'ACTIVE'
    repo().links[0]!.nicheId = 'niche-apostas'
    expect((await call('GET')).json().allowedSurfaces).toEqual(['SEARCH', 'NICHE'])
    expect((await call('PUT', { surfaces: ['HOME'], expiresAt: null })).statusCode).toBe(409)
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null })).statusCode).toBe(200)
  })
  it('preserva destaque pago e pagamentos pendentes, inclusive ao remover', async () => {
    const store = getCheckoutStore()
    store.promotions.push({ id: 'paid', linkId: 'link', surface: 'SEARCH', status: 'ACTIVE', activatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) })
    expect((await call('PUT', { surfaces: ['SEARCH'], expiresAt: null })).statusCode).toBe(409)
    store.holds.push({ linkId: 'link', surface: 'NICHE', orderId: 'pending', hold: 'PENDING_PAYMENT' })
    expect((await call('PUT', { surfaces: ['NICHE'], expiresAt: null })).statusCode).toBe(409)
    expect((await call('PUT', { surfaces: ['HOME'], expiresAt: null })).statusCode).toBe(200)
    expect((await call('DELETE')).statusCode).toBe(200)
    expect(store.promotions.find(row => row.id === 'paid')?.status).toBe('ACTIVE')
  })
  it('expira somente o administrativo e cancela ao tirar link do ar', async () => {
    await call('PUT', { surfaces: ['SEARCH'], expiresAt: null })
    getCheckoutStore().promotions[0]!.expiresAt = new Date('2020-01-01')
    expect((await call('GET')).json().promotions).toEqual([])
    expect(await getCheckoutStore().activeSurfaces('link')).toEqual([])
    await call('PUT', { surfaces: ['SEARCH'], expiresAt: null })
    await repo().cancelActivePromotions(tenantId, 'link')
    expect((await call('GET')).json().promotions).toEqual([])
  })
})
