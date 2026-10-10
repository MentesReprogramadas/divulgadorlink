import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import type { FinanceRow } from '@/domain/finance/report'
import { setFinanceRowsForTest } from '@/http/controllers/@Admin/finance'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'

function token(role: 'ADMIN' | 'USER') {
  return app.jwt.sign({ sub: `${role}-1`, role, tenantId: TENANT_ID, typ: 'access' }, { expiresIn: '5m' })
}

const paid: FinanceRow = {
  id: 'o1', userId: 'u1', userName: 'Ana', email: 'ana@example.com', status: 'PAID', method: 'CARD',
  productCode: 'HOME', durationDays: 7, amountCents: 10_000, savingsCents: 0, renewal: false,
  createdAt: new Date('2026-10-10T13:00:00Z'), paidAt: new Date('2026-10-10T13:01:00Z'), firstPaidAt: new Date('2026-10-10T13:01:00Z'),
  source: '', medium: '', campaign: '',
}

describe('financeiro do admin', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    setFinanceRowsForTest([paid])
  })

  it('esconde de quem não é admin e recusa período invertido', async () => {
    const user = await app.inject({ method: 'GET', url: '/api/v1/admin/finance', headers: { host: HOST, authorization: `Bearer ${token('USER')}` } })
    expect(user.statusCode).toBe(404)
    const inverted = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance?from=2026-10-31&to=2026-10-01',
      headers: { host: HOST, authorization: `Bearer ${token('ADMIN')}` },
    })
    expect(inverted.statusCode).toBe(400)
  })

  it('aplica a taxa gravada e exporta CSV', async () => {
    const headers = { host: HOST, authorization: `Bearer ${token('ADMIN')}` }
    const saved = await app.inject({ method: 'PATCH', url: '/api/v1/admin/finance/fees', headers, payload: { pixBp: 0, pixFixedCents: 85, cardBp: 399, cardFixedCents: 39 } })
    expect(saved.statusCode).toBe(200)
    const report = await app.inject({ method: 'GET', url: '/api/v1/admin/finance?from=2026-10-01&to=2026-10-31', headers })
    expect(report.json().summary).toMatchObject({ revenueCents: 10_000, feesCents: 438, netCents: 9_562 })
    const csv = await app.inject({ method: 'GET', url: '/api/v1/admin/finance/export?from=2026-10-01&to=2026-10-31&kind=orders', headers })
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.body).toContain('o1,u1,Ana,ana@example.com,PAID,CARD,HOME,7,100.00,4.38')
  })
})
