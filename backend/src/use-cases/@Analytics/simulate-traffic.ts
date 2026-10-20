import { Prisma, type PrismaClient } from '@prisma/client'
import { planTraffic, planGrowthTraffic, simulationConfig, simulationHash, trafficConfigForLink, type SimulationConfig } from '@/domain/analytics/traffic-simulation'

export type SimulationInput = {
  tenantId: string; run: string; config: SimulationConfig; through: Date
  dryRun: boolean; rollback: boolean; batchSize: number; linkId?: string
}

export function assertDevelopment(environment: string | undefined, databaseUrl: string, dryRun = false, remoteDevelopment = false): void {
  if (!['development', 'test'].includes(environment ?? '')) throw new Error('NODE_ENV deve ser development ou test')
  const url = new URL(databaseUrl)
  if (!dryRun && !remoteDevelopment && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Use um PostgreSQL local ou --remote-development para o banco remoto de desenvolvimento autorizado')
}

export async function simulateTraffic(db: PrismaClient, input: SimulationInput, log: (data: Record<string, unknown>) => void = console.log) {
  const config = simulationConfig.parse(input.config)
  if (!input.tenantId || !input.run || !Number.isInteger(input.batchSize) || input.batchSize < 1 || input.batchSize > 1000) throw new Error('Tenant, run ou batchSize inválido')
  if (!Number.isFinite(input.through.getTime()) || input.through.getTime() > Date.now() || input.through.getTime() > Date.parse(config.until)) throw new Error('through deve ser válido, <= agora e <= until')
  if (!await db.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true } })) throw new Error('Tenant não encontrado')
  if (input.linkId && !input.rollback && !await db.link.findFirst({ where: { id: input.linkId, tenantId: input.tenantId }, select: { id: true } })) throw new Error('Link não encontrado no tenant')
  const key = simulationHash(`${input.tenantId}:${input.run}`)
  const prefix = `dev-metrics:${key}:`
  const manifestId = `dev-metrics:${key}`
  const identity = JSON.stringify({ config, linkId: input.linkId ?? null })
  const totals = { links: 0, impressions: 0, clicks: 0, deleted: 0 }
  let cursor: string | undefined
  // All mutating calls use the same tenant lock, including different run names.
  const lock = async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`dev-metrics:${input.tenantId}`}))`
  }
  const sponsoredIds = await db.$transaction(async tx => {
    if (input.dryRun) await tx.$executeRaw`SET TRANSACTION READ ONLY`
    if (!input.dryRun) await lock(tx)
    const previous = await tx.auditLog.findUnique({ where: { id: manifestId } })
    if (previous && (previous.after as { identity?: string })?.identity !== identity) throw new Error('Run existente com outra configuração; reutilize a original ou escolha outro run')
    if (previous?.action === 'DEV_METRICS_ROLLED_BACK' && !input.rollback) throw new Error('Run revertido; use outro identificador')
    if (!previous && input.rollback) throw new Error('Run não encontrado')
    if (!previous && config.growth && !input.rollback) {
      const runs = await tx.auditLog.findMany({ where: { tenantId: input.tenantId, entityType: 'AnalyticsSimulation', action: 'DEV_METRICS_STARTED' }, select: { after: true, entityId: true } })
      for (const run of runs) {
        const identity = (run.after as { identity?: string } | null)?.identity
        if (!identity) continue
        const old = JSON.parse(identity) as { config?: { until?: string; growth?: { since: string } } }
        if (old.config?.growth && old.config.until && Date.parse(old.config.growth.since) < Date.parse(config.until) && Date.parse(config.growth.since) < Date.parse(old.config.until)) throw new Error(`Intervalo de crescimento sobreposto ao lote ${run.entityId}; retome esse lote ou use since >= seu until`)
      }
    }
    const savedIds = (previous?.after as { sponsoredIds?: string[] } | null)?.sponsoredIds
    let sponsoredIds = savedIds ?? []
    if (!previous && (config.sponsoredMinViews !== undefined || config.growth) && !input.rollback) {
      const hasPauses = await tx.$queryRaw<Array<{ present: boolean }>>`SELECT to_regclass('promotion_pauses') IS NOT NULL AS present`
      const pauses = hasPauses[0].present ? Prisma.sql`AND NOT EXISTS (SELECT 1 FROM promotion_pauses gap WHERE gap."promotionId"=p.id AND gap."tenantId"=p."tenantId" AND gap."startsAt"<=${new Date(config.until)} AND (gap."endsAt" IS NULL OR gap."endsAt">${new Date(config.until)}))` : Prisma.empty
      const promotions = await tx.$queryRaw<Array<{ linkId: string }>>`SELECT DISTINCT p."linkId" FROM promotions p WHERE p."tenantId"=${input.tenantId} AND p.status='ACTIVE' AND p."activatedAt"<=${new Date(config.until)} AND (p."expiresAt" IS NULL OR p."expiresAt">${new Date(config.until)}) ${pauses}`
      sponsoredIds = promotions.map(row => row.linkId).sort()
    }
    if (!previous && !input.dryRun) await tx.auditLog.create({ data: { id: manifestId, tenantId: input.tenantId, action: 'DEV_METRICS_STARTED', entityType: 'AnalyticsSimulation', entityId: input.run, after: { identity, ...(config.sponsoredMinViews !== undefined || config.growth ? { sponsoredIds } : {}) } } })
    return sponsoredIds
  })
  if (input.rollback) {
    if (input.dryRun) {
      totals.deleted = await db.analyticsEvent.count({ where: { tenantId: input.tenantId, sessionId: { startsWith: prefix } } })
      log({ run: input.run, dryRun: true, ...totals })
      return totals
    }
    for (;;) {
      const deleted = await db.$transaction(async tx => {
        if (!input.dryRun) await lock(tx)
        const rows = await tx.analyticsEvent.findMany({ where: { tenantId: input.tenantId, sessionId: { startsWith: prefix } }, take: input.batchSize, select: { id: true } })
        if (!rows.length) {
          await tx.auditLog.update({ where: { id: manifestId }, data: { action: 'DEV_METRICS_ROLLED_BACK' } })
          return 0
        }
        const result = await tx.analyticsEvent.deleteMany({ where: { tenantId: input.tenantId, id: { in: rows.map(row => row.id) }, sessionId: { startsWith: prefix } } })
        await tx.auditLog.update({ where: { id: manifestId }, data: { action: 'DEV_METRICS_ROLLED_BACK' } })
        await tx.auditLog.create({ data: { tenantId: input.tenantId, action: 'DEV_METRICS_DELETE_BATCH', entityType: 'AnalyticsSimulation', entityId: input.run, after: { deleted: result.count } } })
        return result.count
      })
      totals.deleted += deleted
      if (input.dryRun || deleted === 0) break
    }
    log({ run: input.run, dryRun: input.dryRun, ...totals })
    return totals
  }
  for (;;) {
    const links = await db.link.findMany({ where: { tenantId: input.tenantId, ...(input.linkId ? { id: input.linkId } : {}), ...(config.growth ? { status: 'PUBLISHED' } : {}), createdAt: { lt: new Date(config.until) } }, orderBy: { id: 'asc' }, take: input.batchSize, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, tenantId: true, createdAt: true } })
    if (!links.length) break
    for (const link of links) {
      const sponsored = sponsoredIds.includes(link.id)
      const linkConfig = trafficConfigForLink(config, sponsored, link)
      const visits = (config.growth ? planGrowthTraffic(link, linkConfig, prefix, sponsored) : planTraffic(link, linkConfig, prefix)).filter(visit => visit.at <= input.through)
      const result = await db.$transaction(async tx => {
        if (input.dryRun) await tx.$executeRaw`SET TRANSACTION READ ONLY`
        if (!input.dryRun) await lock(tx)
        const current = await tx.auditLog.findUnique({ where: { id: manifestId } })
        if (current?.action === 'DEV_METRICS_ROLLED_BACK') throw new Error('Run revertido durante execução')
        const existing = await tx.analyticsEvent.findMany({ where: { tenantId: input.tenantId, linkId: link.id, sessionId: { startsWith: prefix } }, select: { sessionId: true, kind: true } })
        const known = new Set(existing.map(row => `${row.sessionId}:${row.kind}`))
        // Older development databases have no provenance column; their events are all real.
        const counts = await tx.$queryRaw<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM analytics_events a WHERE "tenantId" = ${input.tenantId} AND "linkId" = ${link.id} AND kind = 'IMPRESSION' AND COALESCE(to_jsonb(a)->>'type', 'REAL') = 'REAL'`
        const count = counts[0].n
        const target = config.mode === 'top-up' ? visits.length : linkConfig.maxViews
        let budget = Math.max(0, Math.min(linkConfig.maxViews, target) - count)
        const data: Prisma.AnalyticsEventCreateManyInput[] = []
        for (const visit of visits) {
          const hasView = known.has(`${visit.sessionId}:IMPRESSION`)
          if (!hasView && budget === 0) continue
          const base = { tenantId: link.tenantId, linkId: link.id, sessionId: visit.sessionId, surface: 'ORGANIC', day: new Date(visit.day + 'T00:00:00Z'), createdAt: visit.at, updatedAt: visit.at }
          if (!hasView) { data.push({ ...base, id: simulationHash(`${visit.sessionId}:IMPRESSION`), kind: 'IMPRESSION' }); budget-- }
          if (visit.click && !known.has(`${visit.sessionId}:CLICK`)) data.push({ ...base, id: simulationHash(`${visit.sessionId}:CLICK`), kind: 'CLICK' })
        }
        if (!input.dryRun) {
          // Explicit columns support both the original schema and the optional provenance migration.
          for (let offset = 0; offset < data.length; offset += input.batchSize) {
            const rows = data.slice(offset, offset + input.batchSize).map(row => Prisma.sql`(${row.id}, ${row.tenantId}, ${row.sessionId}, ${row.linkId}, ${row.surface}, ${row.day}::date, ${row.kind}, ${row.createdAt}, ${row.updatedAt})`)
            await tx.$executeRaw`INSERT INTO analytics_events (id, "tenantId", "sessionId", "linkId", surface, day, kind, "createdAt", "updatedAt") VALUES ${Prisma.join(rows)} ON CONFLICT ("sessionId", "linkId", surface, day, kind) DO NOTHING`
          }
          if (data.length) await tx.auditLog.create({ data: { tenantId: input.tenantId, action: 'DEV_METRICS_LINK_BATCH', entityType: 'AnalyticsSimulation', entityId: input.run, after: { linkId: link.id, events: data.length, through: input.through.toISOString() } } })
        }
        return { impressions: data.filter(row => row.kind === 'IMPRESSION').length, clicks: data.filter(row => row.kind === 'CLICK').length }
      }, { timeout: 60000 })
      totals.links++
      totals.impressions += result.impressions
      totals.clicks += result.clicks
      log({ run: input.run, linkId: link.id, sponsored, dryRun: input.dryRun, ...result })
    }
    cursor = links[links.length - 1].id
  }
  log({ run: input.run, dryRun: input.dryRun, ...totals })
  return totals
}
