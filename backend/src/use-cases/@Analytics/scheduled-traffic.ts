import type { PrismaClient } from '@prisma/client'
import { analyticsDay, analyticsDayStart, shiftAnalyticsDay } from '@/domain/analytics/day'
import { simulationConfig, simulationHash } from '@/domain/analytics/traffic-simulation'
import { simulateTraffic, type SimulationInput } from './simulate-traffic'

export const scheduledMetricsTenant = 'cmuvlp9th0000o7014v8mxerz'
const activation = '2026-10-21T13:00:00.000Z'
const recoveryActivation = '2026-10-23T03:00:00.000Z'

export function scheduledTrafficInput(now: Date, dryRun: boolean): SimulationInput {
  const day = analyticsDay(now)
  const recovery = now.getTime() >= Date.parse(recoveryActivation)
  return {
    tenantId: scheduledMetricsTenant, run: `scheduled-metrics-${recovery ? 'v2' : 'v1'}-${day}`, through: now,
    dryRun, rollback: false, batchSize: 250,
    config: simulationConfig.parse({
      seed: 'tem-link-dev-1', until: analyticsDayStart(shiftAnalyticsDay(day, 1)).toISOString(),
      minViews: 0, maxViews: 4000, commonMaxViews: 3500, sponsoredCeilingMinViews: 3501,
      medianViews: 650, sigma: 0.35, minCtr: 0.025, maxCtr: 0.12, maturityDays: 30,
      weekendFactor: 1.15, spikeProbability: 0.025, spikeMultiplier: 2.2,
      growth: { since: day === analyticsDay(new Date(activation)) ? activation : analyticsDayStart(day).toISOString(), dailyMedian: 240, dailyMin: 180,
        dailyMax: 300, warmupDays: 14, sponsoredMultiplier: 1.25, ...(recovery ? { softLimit: true } : {}) },
    }),
  }
}

export function assertScheduledEnvironment(environment: string | undefined, allowProduction: boolean): void {
  if (!['development', 'test'].includes(environment ?? '') && !(environment === 'production' && allowProduction)) {
    throw new Error('Produção exige --allow-production; a execução é restrita ao tenant configurado')
  }
}

export async function runScheduledTraffic(db: PrismaClient, now: Date, dryRun: boolean, log: (data: Record<string, unknown>) => void) {
  const today = scheduledTrafficInput(now, dryRun)
  const previous = scheduledTrafficInput(new Date(analyticsDayStart(analyticsDay(now)).getTime() - 1), dryRun)
  const id = `dev-metrics:${simulationHash(`${previous.tenantId}:${previous.run}`)}`
  const manifest = await db.auditLog.findUnique({ where: { id }, select: { action: true } })
  // Finish yesterday's last minutes only if its scheduled run was already started.
  if (manifest?.action === 'DEV_METRICS_STARTED') await simulateTraffic(db, {
    ...previous, through: new Date(previous.config.until),
  }, log)
  return simulateTraffic(db, today, log)
}
