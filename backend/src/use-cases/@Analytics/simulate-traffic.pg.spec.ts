import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { afterAll, expect, it } from 'vitest'
import { simulationConfig } from '@/domain/analytics/traffic-simulation'
import { PrismaAnalyticsRepository } from '@/repositories/analytics-repository'
import { simulateTraffic, type SimulationInput } from './simulate-traffic'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url) throw new Error('ANALYTICS_DATABASE_URL ausente')
const db = new PrismaClient({ datasources: { db: { url } } })
const tenantId = `metrics-test-${randomUUID()}`
afterAll(async () => {
  await db.analyticsEvent.deleteMany({ where: { tenantId } })
  await db.auditLog.deleteMany({ where: { tenantId } })
  await db.link.deleteMany({ where: { tenantId } })
  await db.network.deleteMany({ where: { tenantId } })
  await db.niche.deleteMany({ where: { tenantId } })
  await db.tenant.deleteMany({ where: { id: tenantId } })
  await db.$disconnect()
})

it('persiste no agregado real, retoma, limita, audita e reverte sem apagar evento existente', async () => {
  await db.tenant.create({ data: { id: tenantId, host: `${tenantId}.localhost`, name: 'Simulation test' } })
  const network = await db.network.create({ data: { tenantId, name: 'Network', slug: 'network', knownHosts: [] } })
  const niche = await db.niche.create({ data: { tenantId, name: 'Niche', slug: 'niche' } })
  const link = await db.link.create({ data: { tenantId, canonicalUrl: 'https://example.com', name: 'Test', description: 'Test', networkId: network.id, nicheId: niche.id, status: 'PUBLISHED', createdAt: new Date('2026-09-01T00:00Z') } })
  const real = await db.analyticsEvent.create({ data: { tenantId, linkId: link.id, sessionId: 'real-visitor', surface: 'ORGANIC', kind: 'IMPRESSION', day: new Date('2026-09-01T00:00Z'), createdAt: new Date('2026-09-01T00:00Z') } })
  const config = simulationConfig.parse({ until: '2026-10-01T00:00:00.000Z', minViews: 100, maxViews: 100, medianViews: 100, sigma: 0.05, minCtr: 0.4, maxCtr: 0.4 })
  const input: SimulationInput = { tenantId, run: 'integration', config, through: new Date('2026-09-12T00:00Z'), batchSize: 7, dryRun: true, rollback: false }
  const execute = (override: Partial<SimulationInput> = {}) => simulateTraffic(db, { ...input, ...override }, () => {})
  expect((await execute()).impressions).toBeGreaterThan(0)
  expect(await db.analyticsEvent.count({ where: { tenantId } })).toBe(1)
  expect(await db.auditLog.count({ where: { tenantId } })).toBe(0)
  await execute({ dryRun: false })
  expect((await execute({ dryRun: false })).impressions).toBe(0)
  const through = new Date(config.until)
  await Promise.all([execute({ dryRun: false, through }), execute({ dryRun: false, through })])
  const totals = await new PrismaAnalyticsRepository(db).totals({ tenantId, linkId: link.id })
  expect(totals.impressions).toBe(100)
  expect(totals.clicks).toBeGreaterThan(0)
  const invalid = await db.$queryRaw<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM analytics_events c WHERE c."tenantId" = ${tenantId} AND c.kind = 'CLICK' AND NOT EXISTS (SELECT 1 FROM analytics_events v WHERE v."sessionId" = c."sessionId" AND v.kind = 'IMPRESSION' AND v.day = c.day AND v."createdAt" <= c."createdAt")`
  expect(invalid[0].n).toBe(0)
  await expect(execute({ dryRun: false, config: { ...config, seed: 'changed' } })).rejects.toThrow('outra configuração')
  const preview = await execute({ rollback: true })
  expect(preview.deleted).toBe(totals.impressions + totals.clicks - 1)
  expect((await execute({ dryRun: false, rollback: true })).deleted).toBe(preview.deleted)
  expect((await execute({ dryRun: false, rollback: true })).deleted).toBe(0)
  expect(await db.analyticsEvent.findUnique({ where: { id: real.id } })).not.toBeNull()
  expect(await db.analyticsEvent.count({ where: { tenantId } })).toBe(1)
  expect(await db.auditLog.count({ where: { tenantId } })).toBeGreaterThan(2)
  await expect(execute({ dryRun: false })).rejects.toThrow('revertido')
  const common = await db.link.create({ data: { tenantId, canonicalUrl: 'https://example.com/new', name: 'New common', description: 'Test', networkId: network.id, nicheId: niche.id, status: 'PUBLISHED', createdAt: new Date('2026-09-30T00:00Z') } })
  const promotion = await db.promotion.create({ data: { tenantId, linkId: link.id, status: 'ACTIVE', surface: 'HOME', administrative: true, activatedAt: new Date('2026-09-02T00:00Z') } })
  try {
    const groupedConfig = simulationConfig.parse({ until: config.until, mode: 'top-up', minViews: 800, maxViews: 4000, medianViews: 2200, sigma: 0.6, maturityDays: 0.25, commonMaxViews: 3500, sponsoredMinViews: 3800 })
    const grouped = { run: 'grouped', config: groupedConfig, through, dryRun: false, batchSize: 1000 }
    await execute(grouped)
    const sponsoredTotals = await new PrismaAnalyticsRepository(db).totals({ tenantId, linkId: link.id })
    const commonTotals = await new PrismaAnalyticsRepository(db).totals({ tenantId, linkId: common.id })
    expect(sponsoredTotals.impressions).toBeGreaterThanOrEqual(3800)
    expect(sponsoredTotals.impressions).toBeLessThanOrEqual(4000)
    expect(commonTotals.impressions).toBeGreaterThanOrEqual(800)
    expect(commonTotals.impressions).toBeLessThanOrEqual(3500)
    expect(sponsoredTotals.impressions).toBeGreaterThan(commonTotals.impressions)
    // Promotion snapshot and total targets survive subsequent status changes.
    await db.promotion.update({ where: { id: promotion.id }, data: { status: 'CANCELLED' } })
    expect((await execute(grouped)).impressions).toBe(0)
    await execute({ ...grouped, rollback: true })
    expect(await db.analyticsEvent.count({ where: { tenantId } })).toBe(1)
    const growthConfig = simulationConfig.parse({ until: '2026-10-03T00:00:00.000Z', minViews: 0, maxViews: 4000, growth: { since: config.until } })
    const draft = await db.link.create({ data: { tenantId, canonicalUrl: 'https://example.com/draft', name: 'Draft', description: 'Test', networkId: network.id, nicheId: niche.id, status: 'DRAFT', createdAt: common.createdAt } })
    const growthInput = { run: 'daily-growth', config: growthConfig, through: new Date(growthConfig.until), dryRun: false }
    expect((await execute({ ...growthInput, dryRun: true })).impressions).toBeGreaterThan(0)
    await execute(growthInput)
    expect(await db.analyticsEvent.count({ where: { tenantId, linkId: draft.id } })).toBe(0)
    expect((await execute(growthInput)).impressions).toBe(0)
    await expect(execute({ ...growthInput, run: 'overlap' })).rejects.toThrow('sobreposto')
    await execute({ ...growthInput, rollback: true })
    expect(await db.analyticsEvent.count({ where: { tenantId } })).toBe(1)
    const stronger = simulationConfig.parse({ ...growthConfig, until: '2026-10-03T03:00:00.000Z', growth: { ...growthConfig.growth, since: '2026-10-01T03:00:00.000Z', dailyMin: 180, dailyMedian: 240, dailyMax: 300 } })
    const replacement = { ...growthInput, run: 'daily-replacement', config: stronger, through: new Date(stronger.until) }
    expect((await execute(replacement)).impressions).toBeGreaterThanOrEqual(720)
    expect((await execute(replacement)).impressions).toBe(0)
    await execute({ ...replacement, rollback: true })
    expect(await db.analyticsEvent.count({ where: { tenantId } })).toBe(1)
    const softConfig = simulationConfig.parse({ ...stronger, maxViews: 20, until: '2026-10-05T03:00:00.000Z', growth: { ...stronger.growth, since: '2026-10-04T03:00:00.000Z', softLimit: true } })
    const softInput = { run: 'soft-growth', config: softConfig, through: new Date(softConfig.until), dryRun: false }
    const beforeDryRun = await db.auditLog.count({ where: { tenantId } })
    expect((await execute({ ...softInput, dryRun: true })).impressions).toBeGreaterThan(20)
    expect(await db.auditLog.count({ where: { tenantId } })).toBe(beforeDryRun)
    expect((await execute(softInput)).impressions).toBeGreaterThan(20)
    expect(await db.auditLog.count({ where: { tenantId, entityType: 'AnalyticsRecovery' } })).toBe(2)
    expect((await execute(softInput)).impressions).toBe(0)
    await execute({ ...softInput, rollback: true })
    expect(await db.analyticsEvent.count({ where: { tenantId } })).toBe(1)
  } finally { await db.promotion.delete({ where: { id: promotion.id } }) }
}, 60000)
