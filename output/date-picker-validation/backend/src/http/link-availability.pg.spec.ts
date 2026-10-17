import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaLinkAvailabilityRepository, setLinkAvailabilityRepositoryForTest } from '@/repositories/link-availability-repository'
import { setAvailabilityProbeForTest } from '@/http/controllers/@Links/availability'
import { monitorPolicy } from '@/domain/links/availability-monitor'
import { decideUrl, proposeUrl } from '@/use-cases/@Links/link-availability'
import { deliverAvailabilityNotices, runAvailabilityCycle } from '@/use-cases/@Links/monitor-availability'
import { activatePaidWithInvestment } from '@/use-cases/@Promotions/activate-paid-with-investment'
import { promotionPerformance } from '@/use-cases/@Analytics/promotion-performance'
import { PrismaPromotionPerformanceRepository } from '@/repositories/promotion-performance-repository'
import { analyticsDay } from '@/domain/analytics/day'
import type { OutboundEmail } from '@/adapters/notifications/resend-mailer'
import { Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import { createWorker } from '@/worker'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Banco F07 deve ser local descartável')
const db = new PrismaClient({ datasources: { db: { url } } })
const policy = monitorPolicy({ AVAILABILITY_ENABLED: '1' })
const base = new Date('2026-10-10T12:00Z')
const day = 86400000
let tenant: string, owner: string, other: string, admin: string, link: string, host: string, repo: PrismaLinkAvailabilityRepository
beforeAll(async () => {
  setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } })
  await app.ready()
})
beforeEach(async () => {
  // Previous synthetic cases are retained for audit, but must not consume this delivery fixture's batch.
  await db.linkAvailability.updateMany({ where: { tenantId: { startsWith: 'f07-' }, notificationPendingAt: { not: null } }, data: { notificationNextAt: new Date('2100-01-01T00:00Z') } })
  tenant = 'f07-' + randomUUID(); owner = 'owner-' + tenant; other = 'other-' + tenant; admin = 'admin-' + tenant; host = tenant + '.test'; link = 'link-' + tenant
  repo = new PrismaLinkAvailabilityRepository(db); setLinkAvailabilityRepositoryForTest(repo); setAvailabilityProbeForTest(async () => 200)
  await db.tenant.create({ data: { id: tenant, host, name: 'F07' } })
  for (const [id, role] of [[owner, 'USER'], [other, 'USER'], [admin, 'ADMIN']] as const) await db.user.create({ data: { id, tenantId: tenant, role, name: id, passwordHash: 'fixture', identifiers: { create: { tenantId: tenant, kind: 'EMAIL', normalizedValue: id + '@example.test', confirmedAt: base } } } })
  await db.network.create({ data: { id: 'net-' + tenant, tenantId: tenant, slug: 'site', name: 'Site', knownHosts: [] } })
  await db.niche.create({ data: { id: 'niche-' + tenant, tenantId: tenant, slug: 'estudo', name: 'Estudo' } })
  await db.link.create({ data: { id: link, tenantId: tenant, ownerId: owner, canonicalUrl: 'https://' + tenant + '.example.com/original', name: 'Clube F07', description: 'Fixture', status: 'PUBLISHED', everPublished: true, networkId: 'net-' + tenant, nicheId: 'niche-' + tenant } })
  await db.linkAvailability.create({ data: { linkId: link, tenantId: tenant, nextCheckAt: base } })
})
afterAll(async () => { setLinkAvailabilityRepositoryForTest(null); setAvailabilityProbeForTest(null); await db.$disconnect() })
const ctx = () => ({ tenantId: tenant, actorId: owner, linkId: link })
function headers(actor: string | null = owner, tokenTenant = tenant) { return { host, ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, typ: 'access', role: actor === admin ? 'ADMIN' : 'USER' }) } : {}) } }
const read = (actor: string | null = owner, tokenTenant = tenant) => app.inject({ method: 'GET', url: '/api/v1/links/' + link + '/availability', headers: headers(actor, tokenTenant) })
async function observe(status: number | null, now: Date) {
  const claim = await repo.claim(tenant, link, now, policy)
  expect(claim).not.toBeNull()
  expect(await repo.observe(claim!, status, now, policy)).toBe(true)
  return db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })
}
async function withdraw(at = new Date(base.getTime() + 3 * day)) {
  await db.linkAvailability.update({ where: { linkId: link }, data: { failures: 2, nextCheckAt: at } })
  return observe(410, at)
}
async function paid(days = 10, renewal = false, surface: 'SEARCH' | 'HOME' = 'SEARCH') {
  return db.order.create({ data: { tenantId: tenant, userId: owner, linkId: link, status: 'PAID', method: 'PIX', productCode: surface, durationDays: days, amountCents: days * 100, savingsCents: 0, renewal, surfaces: { create: { linkId: link, surface } } } })
}
async function proposal(now: Date) {
  const check = await db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })
  await proposeUrl({ ...ctx(), canonicalUrl: 'https://' + tenant + '.example.com/corrigido', expectedVersion: check.version }, repo, async () => 200, now)
  return db.urlRevision.findFirstOrThrow({ where: { linkId: link, status: 'PENDING' } })
}
async function decisionInput(now: Date) {
  const revision = await db.urlRevision.findFirstOrThrow({ where: { linkId: link, status: 'PENDING' } })
  const check = await db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })
  return { tenantId: tenant, actorId: admin, revisionId: revision.id, expectedVersion: check.version, decision: 'APPROVE' as const, reason: 'Convite corrigido e conteúdo conferido.', requestId: 'f07-pg', now }
}

describe('F07 PostgreSQL, probes e HTTP', () => {
  it('F07-W01 worker BullMQ real respeita o vencimento entre reentregas', async () => {
    await db.linkAvailability.update({ where: { linkId: link }, data: { nextCheckAt: new Date('2000-01-01T00:00Z') } })
    const connection = new Redis('redis://127.0.0.1:6380', { maxRetriesPerRequest: null })
    const queueName = 'f07-worker-' + randomUUID(), queue = new Queue(queueName, { connection }), events = new QueueEvents(queueName, { connection })
    const worker = createWorker(connection, { textJudge: null, db, availability: { now: base, policy, probe: async url => url.includes(tenant) ? 404 : 200, deliver: async () => {} } }, queueName)
    try {
      await events.waitUntilReady()
      for (let i = 0; i < 2; i++) {
        const job = await queue.add('availability-cycle', {}, { jobId: 'probe-' + i, removeOnComplete: true })
        await job.waitUntilFinished(events, 10000)
      }
      expect((await db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })).failures).toBe(1)
      expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
    } finally { await worker.close(); await events.close(); await queue.obliterate({ force: true }); await queue.close(); await connection.quit() }
  })
  it('F07-T01/T02 uma falha e bloqueios não retiram; limiar persistido retira uma vez', async () => {
    const first = await observe(null, base)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
    const blocked = await observe(403, first.nextCheckAt)
    expect(blocked.failures).toBe(0)
    const second = await observe(404, blocked.nextCheckAt)
    const third = await observe(503, second.nextCheckAt)
    const fourth = await observe(null, third.nextCheckAt)
    expect(fourth.state).toBe('UNAVAILABLE')
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).occupiesSlot).toBe(false)
    await observe(200, fourth.nextCheckAt)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('UNAVAILABLE')
    expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'link.availability.withdrawn' } })).toBe(1)
  })
  it('F07-T03 um host tem uma concessão global mesmo entre links e reentregas concorrentes', async () => {
    const secondTenant = await db.tenant.create({ data: { name: 'Tenant B', host: randomUUID() + '.test' } })
    const secondOwner = await db.user.create({ data: { tenantId: secondTenant.id, name: 'B', passwordHash: 'fixture' } })
    const secondNetwork = await db.network.create({ data: { tenantId: secondTenant.id, name: 'Site', slug: 'site' } })
    const secondNiche = await db.niche.create({ data: { tenantId: secondTenant.id, name: 'Estudo', slug: 'estudo' } })
    const sibling = await db.link.create({ data: { id: randomUUID(), tenantId: secondTenant.id, ownerId: secondOwner.id, canonicalUrl: 'https://' + tenant + '.example.com/outro', name: 'Outro', description: '', status: 'PUBLISHED', networkId: secondNetwork.id, nicheId: secondNiche.id } })
    await db.linkAvailability.create({ data: { linkId: sibling.id, tenantId: secondTenant.id, nextCheckAt: base } })
    const claims = await Promise.all([repo.claim(tenant, link, base, policy), repo.claim(secondTenant.id, sibling.id, base, policy), repo.claim(tenant, link, base, policy)])
    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(await repo.claim(secondTenant.id, sibling.id, new Date(base.getTime() + 1000), policy)).toBeNull()
  })
  it('F07-I01 concessão expirada permite retomada e probe antigo não sobrescreve o atual', async () => {
    const stale = await repo.claim(tenant, link, base, policy)
    const later = new Date(base.getTime() + 120001)
    const fresh = await repo.claim(tenant, link, later, policy)
    expect(fresh).not.toBeNull()
    expect(await repo.observe(stale!, 410, later, policy)).toBe(false)
    expect(await repo.observe(fresh!, 200, later, policy)).toBe(true)
    expect(await repo.observe(fresh!, 410, later, policy)).toBe(false)
    expect((await db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })).state).toBe('ACCESSIBLE')
  })
  it('F07-I01 proposta e aprovação invalidam probes da URL anterior', async () => {
    const paused = await withdraw()
    const claimed = await repo.claim(tenant, link, paused.nextCheckAt, policy)
    expect(claimed).not.toBeNull()
    const revision = await proposal(paused.nextCheckAt)
    await db.linkAvailability.update({ where: { linkId: link }, data: { nextCheckAt: new Date('2000-01-01T00:00Z') } })
    expect((await repo.due(paused.nextCheckAt)).some(row => row.linkId === link)).toBe(false)
    expect(await repo.observe(claimed!, 410, paused.nextCheckAt, policy)).toBe(false)
    await decideUrl(await decisionInput(paused.nextCheckAt), repo, async () => 200)
    expect(await repo.observe(claimed!, 410, paused.nextCheckAt, policy)).toBe(false)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).canonicalUrl).toBe(revision.canonicalUrl)
  })
  it('F07-T05 destaque já vencido não ganha saldo nem é reativado', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base)
    await withdraw(new Date(base.getTime() + 11 * day))
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('EXPIRED')
    expect(await db.promotionPause.count({ where: { tenantId: tenant } })).toBe(0)
    const at = new Date(base.getTime() + 12 * day)
    await proposal(at); await decideUrl(await decisionInput(at), repo, async () => 200)
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('EXPIRED')
  })
  it('F07-T05 destino original recuperado também exige revalidação e aprovação, sem forçar rotação do convite', async () => {
    const paused = await withdraw()
    const original = (await db.link.findUniqueOrThrow({ where: { id: link } })).canonicalUrl
    await proposeUrl({ ...ctx(), canonicalUrl: original, expectedVersion: paused.version }, repo, async () => 200, paused.nextCheckAt)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('UNAVAILABLE')
    await decideUrl(await decisionInput(paused.nextCheckAt), repo, async () => 200)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
  })
  it('F07-T05 elegibilidade de idade é revalidada antes de retomar HOME, sem consumir saldo', async () => {
    const order = await paid(10, false, 'HOME'); await activatePaidWithInvestment(db, order.id, base); await withdraw()
    const at = new Date(base.getTime() + 4 * day); await proposal(at)
    await db.niche.update({ where: { id: 'niche-' + tenant }, data: { requiresAge: true } })
    await expect(decideUrl(await decisionInput(at), repo, async () => 200)).rejects.toThrow('elegibilidade')
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('PAUSED')
    expect((await db.promotionPause.findFirstOrThrow({ where: { tenantId: tenant } })).remainingMs).toBe(BigInt(7 * day))
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('UNAVAILABLE')
  })
  it('F07-T05 mudança da rede durante o probe não publica um destino incompatível', async () => {
    await withdraw(); const at = new Date(base.getTime() + 4 * day); await proposal(at)
    const input = await decisionInput(at)
    await expect(decideUrl(input, repo, async () => {
      await db.network.update({ where: { id: 'net-' + tenant }, data: { knownHosts: ['another.example'] } })
      return 200
    })).rejects.toThrow('validar')
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('UNAVAILABLE')
  })
  it('F07-T05 D08 pausa sete dias, corrige com aprovação e estende o prazo sem alterar valor pago', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base)
    const pausedAt = new Date(base.getTime() + 3 * day)
    await withdraw(pausedAt)
    const campaign = await db.promotion.findFirstOrThrow({ where: { linkId: link } })
    expect(campaign.status).toBe('PAUSED')
    expect((await db.promotionPause.findFirstOrThrow({ where: { promotionId: campaign.id } })).remainingMs).toBe(BigInt(7 * day))
    const resumedAt = new Date(base.getTime() + 13 * day)
    const revision = await proposal(resumedAt)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).canonicalUrl).not.toBe(revision.canonicalUrl)
    await decideUrl(await decisionInput(resumedAt), repo, async () => 200)
    const resumed = await db.promotion.findUniqueOrThrow({ where: { id: campaign.id } })
    expect(resumed.status).toBe('ACTIVE'); expect(resumed.expiresAt).toEqual(new Date(resumedAt.getTime() + 7 * day))
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).amountCents).toBe(1000)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).canonicalUrl).toBe(revision.canonicalUrl)
    expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'link.url.decided' } })).toBe(1)
  })
  it('F07-T05 pagamento anterior confirmado durante pausa mantém todo benefício, inclusive renovação pendente', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base)
    await withdraw()
    const renewal = await paid(7, true)
    await activatePaidWithInvestment(db, renewal.id, new Date(base.getTime() + 4 * day))
    const campaign = await db.promotion.findFirstOrThrow({ where: { linkId: link } })
    expect((await db.promotionPause.findFirstOrThrow({ where: { promotionId: campaign.id, endsAt: null } })).remainingMs).toBe(BigInt(14 * day))
    const future = await paid(7)
    await activatePaidWithInvestment(db, future.id, new Date(base.getTime() + 5 * day))
    expect((await db.promotionInvestment.findFirstOrThrow({ where: { orderId: future.id }, include: { promotion: true } })).promotion.status).toBe('PAUSED')
    expect(await db.promotionInvestment.count({ where: { orderId: renewal.id } })).toBe(1)
    await activatePaidWithInvestment(db, renewal.id, new Date(base.getTime() + 6 * day))
    expect((await db.promotionPause.findFirstOrThrow({ where: { promotionId: campaign.id, endsAt: null } })).remainingMs).toBe(BigInt(14 * day))
  })
  it('F07-I02 sessão, tenant, dono, admin atual, verificação e dados privados são conferidos no servidor', async () => {
    expect((await read(null)).statusCode).toBe(401)
    expect((await read(other)).statusCode).toBe(404)
    expect((await read(owner, 'foreign')).statusCode).toBe(403)
    expect((await read()).headers['cache-control']).toBe('private, no-store')
    await withdraw()
    const body = { canonicalUrl: 'https://example.com/correction', expectedVersion: (await read()).json().availability.version }
    const post = (actor: string) => app.inject({ method: 'POST', url: '/api/v1/links/' + link + '/url-proposals', headers: headers(actor), payload: body })
    expect((await post(other)).statusCode).toBe(404)
    await db.userIdentifier.updateMany({ where: { userId: owner }, data: { confirmedAt: null } })
    expect((await post(owner)).statusCode).toBe(409)
    await db.user.update({ where: { id: admin }, data: { role: 'USER' } })
    expect((await app.inject({ method: 'GET', url: '/api/v1/admin/url-proposals', headers: headers(admin) })).statusCode).toBe(404)
    expect(await db.urlRevision.count({ where: { tenantId: tenant } })).toBe(0)
  })
  it('F07-T04 API recusa destino interno pelo adapter real antes de gravar proposta', async () => {
    const paused = await withdraw()
    setAvailabilityProbeForTest(null)
    for (const candidate of ['https://127.0.0.1/private', 'https://[::1]/private', 'https://169.254.169.254/private', 'https://localhost/private', 'https://user:secret@example.com']) {
      const result = await app.inject({ method: 'POST', url: '/api/v1/links/' + link + '/url-proposals', headers: headers(), payload: { canonicalUrl: candidate, expectedVersion: paused.version } })
      expect(result.statusCode).toBe(400)
      expect(result.body).not.toContain('stack')
    }
    expect(await db.urlRevision.count({ where: { linkId: link } })).toBe(0)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('UNAVAILABLE')
  })
  it('F07-I03 rollback de audit conserva proposta, saldo e URL; decisão concorrente só aplica uma vez', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base); await withdraw()
    await proposal(new Date(base.getTime() + 4 * day))
    const input = await decisionInput(new Date(base.getTime() + 5 * day))
    const faulty = new PrismaLinkAvailabilityRepository(db, () => ({ async create() { throw new Error('audit failure') }, async latest() { return null } }))
    await expect(decideUrl(input, faulty, async () => 200)).rejects.toThrow('audit failure')
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('PAUSED')
    expect((await db.urlRevision.findUniqueOrThrow({ where: { id: input.revisionId } })).status).toBe('PENDING')
    const result = await Promise.allSettled([decideUrl(input, repo, async () => 200), decideUrl(input, repo, async () => 200)])
    expect(result.filter(row => row.status === 'fulfilled')).toHaveLength(1)
    expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'link.url.decided' } })).toBe(1)
  })
  it('F07-T05 recusa HTTP preserva saldo e permite nova proposta sem reaplicar decisão antiga', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base); await withdraw()
    await proposal(new Date(base.getTime() + 4 * day))
    const input = await decisionInput(new Date(base.getTime() + 5 * day))
    const payload = { decision: 'REJECT', expectedVersion: input.expectedVersion, reason: 'Convite não corresponde à comunidade apresentada.' }
    const refuse = () => app.inject({ method: 'PATCH', url: '/api/v1/admin/url-proposals/' + input.revisionId + '/decision', headers: headers(admin), payload })
    expect((await refuse()).statusCode).toBe(200)
    expect((await refuse()).statusCode).toBe(409)
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('PAUSED')
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('UNAVAILABLE')
    const next = await proposal(new Date(base.getTime() + 6 * day))
    expect(next.id).not.toBe(input.revisionId)
    expect(await db.urlRevision.count({ where: { linkId: link, status: 'REJECTED' } })).toBe(1)
    expect(await db.urlRevision.count({ where: { linkId: link, status: 'PENDING' } })).toBe(1)
    expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'link.url.decided' } })).toBe(1)
  })
  it('F07-T05 correção inacessível, falta de vaga e retirada manual não reativam pagamento', async () => {
    await db.link.update({ where: { id: link }, data: { status: 'UNAVAILABLE', occupiesSlot: false } })
    await expect(repo.proposalContext(ctx())).rejects.toThrow('não aguarda')
    await db.link.update({ where: { id: link }, data: { status: 'PUBLISHED', occupiesSlot: true } })
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base); await withdraw()
    await proposal(new Date(base.getTime() + 4 * day))
    const input = await decisionInput(new Date(base.getTime() + 5 * day))
    await expect(decideUrl(input, repo, async () => 403)).rejects.toThrow('ainda não está acessível')
    for (let i = 0; i < 4; i++) await db.link.create({ data: { tenantId: tenant, ownerId: owner, canonicalUrl: 'https://example.com/slot-' + tenant + i, name: 'Slot', description: '', networkId: 'net-' + tenant, nicheId: 'niche-' + tenant, status: 'PUBLISHED' } })
    await expect(decideUrl(input, repo, async () => 200)).rejects.toThrow('Libere uma vaga')
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('PAUSED')
    await db.link.updateMany({ where: { tenantId: tenant, id: { not: link } }, data: { status: 'UNAVAILABLE', occupiesSlot: false } })
    await db.promotion.updateMany({ where: { linkId: link }, data: { status: 'CANCELLED' } })
    await decideUrl(input, repo, async () => 200)
    expect((await db.promotion.findFirstOrThrow({ where: { linkId: link } })).status).toBe('CANCELLED')
  })
  it('F07-PG01 relações compostas recusam tenant cruzado e só uma proposta fica pendente', async () => {
    const foreign = await db.tenant.create({ data: { host: randomUUID() + '.test', name: 'B' } })
    await expect(db.linkAvailability.update({ where: { linkId: link }, data: { tenantId: foreign.id } })).rejects.toThrow()
    await withdraw(); const at = new Date(base.getTime() + 4 * day)
    await Promise.allSettled([proposal(at), proposal(at)])
    expect(await db.urlRevision.count({ where: { linkId: link, status: 'PENDING' } })).toBe(1)
  })
  it('F07-I03 aviso ao dono tem retry durável, chave estável e uma concessão concorrente', async () => {
    const paused = await withdraw()
    const fail = vi.fn(async () => { throw new Error('provider unavailable') })
    expect(await deliverAvailabilityNotices(db, paused.disabledAt!, fail)).toBe(0)
    expect((await db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })).notificationSentAt).toBeNull()
    const next = new Date(paused.disabledAt!.getTime() + 60001), send = vi.fn(async (_mail: OutboundEmail) => {})
    await Promise.all([deliverAvailabilityNotices(db, next, send), deliverAvailabilityNotices(db, next, send)])
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0]).toMatchObject({ kind: 'availability', to: owner + '@example.test' })
    expect((await db.linkAvailability.findUniqueOrThrow({ where: { linkId: link } })).notificationSentAt).not.toBeNull()
  })
  it('F07-T05 relatório F01 não consome investimento nem atribui cliques no intervalo pausado', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base)
    await withdraw()
    const pausedDay = new Date(base.getTime() + 4 * day)
    await db.analyticsEvent.create({ data: { tenantId: tenant, sessionId: randomUUID(), linkId: link, surface: 'SEARCH', day: new Date(analyticsDay(pausedDay) + 'T00:00Z'), kind: 'CLICK', createdAt: pausedDay } })
    const report = await promotionPerformance({ ...ctx(), from: analyticsDay(new Date(base.getTime() + 4 * day)), to: analyticsDay(new Date(base.getTime() + 5 * day)) }, new PrismaPromotionPerformanceRepository(db), new Date(base.getTime() + 6 * day))
    expect(report?.totals).toMatchObject({ clicks: 1, paidClicks: 0, investmentCents: 0, cpcCents: null })
    expect(report?.daily.every(row => !row.highlighted)).toBe(true)
  })
  it('F07 rollout desabilitado não faz rede nem muda dados', async () => {
    const order = await paid(); await activatePaidWithInvestment(db, order.id, base); await withdraw()
    const before = (await read()).json()
    const probe = vi.fn(async () => 410)
    expect(await runAvailabilityCycle(db, { now: base, policy: monitorPolicy({}), probe })).toEqual({ checked: 0, sent: 0 })
    expect(probe).not.toHaveBeenCalled()
    expect((await read()).json()).toEqual(before)
    expect(before.pausedPromotions[0].remainingMs).toBe(7 * day)
    expect(before.canPropose).toBe(true)
  })
})
