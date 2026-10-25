import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, expect, it } from 'vitest'
import { cleanBillingFixture } from '@/test-support/clean-billing-fixture'
import type { BillingGateway } from '@/domain/billing/billing-gateway'
import { PROFILE_CAPABILITIES } from '@/domain/billing/profile-plans'
import type { BillingRuntime } from '@/repositories/profile-billing-repository'
import { configureProfilePlans } from './configure-profile-plans'

const url = process.env.BILLING_DATABASE_URL ?? process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Local disposable billing database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenantId: string, adminId: string, host: string, mismatch: boolean
const forbidden = async () => { throw new Error('Unexpected external side effect') }
const gateway: BillingGateway = {
  livemode: false,
  price: async id => ({ id, productId: id.replace('price_', 'prod_'), productName: 'Fixture', active: true, amountCents: id === 'price_pro' ? (mismatch ? 1491 : 1490) : 2990, currency: 'BRL', interval: 'month', intervalCount: 1, usageType: 'licensed', livemode: false }),
  createCustomer: forbidden, createCheckout: forbidden, checkout: forbidden, expireCheckout: forbidden, subscription: forbidden, subscriptionFromEvent: forbidden, resolveEventSubscription: forbidden,
  checkoutForSubscription: forbidden, cancelAtPeriodEnd: forbidden, cancelUnpaid: forbidden, changeAtPeriodEnd: forbidden, verifyEvent: () => null,
}
const runtime: BillingRuntime = { enabled: true, production: false, gateway, webhookReady: true, delivered: new Set(PROFILE_CAPABILITIES.filter(key => key !== 'profile.subdomain')) }
const options = () => ({ host, adminEmail: 'admin@fixture.test', fiscalReviewed: true as const, proPriceId: 'price_pro', premiumPriceId: 'price_premium', proAmountCents: 1490, premiumAmountCents: 2990 })
beforeEach(async () => {
  tenantId = randomUUID(); adminId = randomUUID(); host = tenantId + '.localhost'; mismatch = false
  await db.tenant.create({ data: { id: tenantId, host, name: 'Fixture' } })
  await db.user.create({ data: { id: adminId, tenantId, name: 'Fixture', passwordHash: 'fixture', role: 'ADMIN', identifiers: { create: [{ tenantId, kind: 'EMAIL', normalizedValue: 'admin@fixture.test', confirmedAt: new Date() }] } } })
})
afterEach(() => cleanBillingFixture(db, tenantId))
afterAll(() => db.$disconnect())

it('configura os dois preços com auditoria, sem criar cobranças, e repetir não cria versões', async () => {
  const catalog = await configureProfilePlans(db, options(), runtime)
  expect(catalog).toEqual([{ tier: 'FREE', amountCents: 0, available: true }, { tier: 'PRO', amountCents: 1490, available: true }, { tier: 'PREMIUM', amountCents: 2990, available: true }])
  await configureProfilePlans(db, options(), runtime)
  expect(await db.profilePlanVersion.count({ where: { tenantId } })).toBe(2)
  expect(await db.auditLog.count({ where: { tenantId } })).toBe(3)
  expect(await db.profileBillingAccount.count({ where: { tenantId } })).toBe(0)
  expect((await db.profilePlanVersion.findMany({ where: { tenantId } })).flatMap(row => row.capabilities)).not.toContain('profile.subdomain')
})
it('exige confirmação fiscal antes de qualquer gravação', async () => {
  await expect(configureProfilePlans(db, { ...options(), fiscalReviewed: false } as unknown as Parameters<typeof configureProfilePlans>[1], runtime)).rejects.toThrow()
  expect(await db.profileBillingSettings.count({ where: { tenantId } })).toBe(0)
})
it('recusa conta sem papel administrativo e preço divergente no provedor', async () => {
  await db.user.update({ where: { id: adminId }, data: { role: 'USER' } })
  await expect(configureProfilePlans(db, options(), runtime)).rejects.toThrow()
  expect(await db.profileBillingSettings.count({ where: { tenantId } })).toBe(0)
  await db.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } }); mismatch = true
  await expect(configureProfilePlans(db, options(), runtime)).rejects.toMatchObject({ status: 422 })
  expect(await db.profilePlan.count({ where: { tenantId, enabled: true } })).toBe(0)
})
