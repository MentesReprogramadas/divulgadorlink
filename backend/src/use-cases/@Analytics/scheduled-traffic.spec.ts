import { expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { planGrowthTraffic } from '@/domain/analytics/traffic-simulation'
import { assertScheduledEnvironment, scheduledTrafficInput, scheduledMetricsTenant, runScheduledTraffic } from './scheduled-traffic'
import { simulateTraffic } from './simulate-traffic'

vi.mock('./simulate-traffic', () => ({ simulateTraffic: vi.fn().mockResolvedValue({ impressions: 0 }) }))

it('mantém a identidade do dia, o tenant e o plano ao avançar quinze minutos', () => {
  const first = scheduledTrafficInput(new Date('2026-10-21T13:15Z'), true)
  const next = scheduledTrafficInput(new Date('2026-10-21T13:30Z'), false)
  expect(first.tenantId).toBe(scheduledMetricsTenant)
  expect(first.config).toEqual(next.config)
  expect(first.run).toBe(next.run)
  expect(first.config.growth?.since).toBe('2026-10-21T13:00:00.000Z')
  expect(first.config.until).toBe('2026-10-22T03:00:00.000Z')
  const link = { id: 'recent', tenantId: first.tenantId, createdAt: new Date('2026-10-21T13:05Z') }
  const full = planGrowthTraffic(link, first.config, 'scheduled:', true)
  const revealed = (through: Date) => full.filter(visit => visit.at <= through)
  expect(revealed(next.through).length).toBeGreaterThanOrEqual(revealed(first.through).length)
  expect(revealed(next.through).length).toBeLessThan(40)
  expect(full.every(visit => visit.at >= link.createdAt)).toBe(true)
  const old = planGrowthTraffic({ ...link, createdAt: new Date('2026-08-01T00:00Z') }, first.config, 'scheduled:', true)
  expect(old.every(visit => visit.at >= new Date('2026-10-21T13:00Z'))).toBe(true)
  expect(scheduledTrafficInput(new Date('2026-10-22T02:59Z'), false).run).toBe(first.run)
  expect(scheduledTrafficInput(new Date('2026-10-22T03:00Z'), false).run).not.toBe(first.run)
})

it('exige autorização explícita para produção sem alterar o ambiente', () => {
  expect(() => assertScheduledEnvironment('production', false)).toThrow('--allow-production')
  expect(() => assertScheduledEnvironment('production', true)).not.toThrow()
  expect(() => assertScheduledEnvironment(undefined, true)).toThrow()
  expect(() => assertScheduledEnvironment('development', false)).not.toThrow()
})

it('ativa a recuperação no próximo dia sem sobrepor ou alterar lotes v1', () => {
  const before = scheduledTrafficInput(new Date('2026-10-23T02:59Z'), false)
  const after = scheduledTrafficInput(new Date('2026-10-23T03:00Z'), false)
  expect(before.run).toBe('scheduled-metrics-v1-2026-10-22')
  expect(before.config.growth?.softLimit).toBeUndefined()
  expect(after.run).toBe('scheduled-metrics-v2-2026-10-23')
  expect(after.config.growth?.softLimit).toBe(true)
  expect(before.config.until).toBe(after.config.growth?.since)
  expect(after.config).toEqual(scheduledTrafficInput(new Date('2026-10-23T06:00Z'), false).config)
})

it('fecha o dia anterior apenas quando o lote existe, sem recuperar dias ausentes', async () => {
  const findUnique = vi.fn().mockResolvedValue(null)
  const db = { auditLog: { findUnique } } as unknown as PrismaClient
  const now = new Date('2026-10-22T03:05:00Z')
  vi.mocked(simulateTraffic).mockClear()
  await runScheduledTraffic(db, now, true, () => {})
  expect(simulateTraffic).toHaveBeenCalledTimes(1)
  expect(vi.mocked(simulateTraffic).mock.calls[0][1].run).toBe('scheduled-metrics-v1-2026-10-22')
  findUnique.mockResolvedValue({ action: 'DEV_METRICS_STARTED' })
  vi.mocked(simulateTraffic).mockClear()
  await runScheduledTraffic(db, now, false, () => {})
  expect(simulateTraffic).toHaveBeenCalledTimes(2)
  expect(vi.mocked(simulateTraffic).mock.calls[0][1]).toMatchObject({ run: 'scheduled-metrics-v1-2026-10-21', through: new Date('2026-10-22T03:00:00Z') })
})
