import { randomUUID } from 'node:crypto'
import { PrismaClient, Prisma } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
import { Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { setRenewalReminderDbForTest } from '@/http/controllers/@Notifications/renewal-reminders'
import { renewalPreferences, readRenewalReminders, runRenewalReminderCycle } from '@/use-cases/@Notifications/renewal-reminders'
import type { OutboundEmail } from '@/adapters/notifications/resend-mailer'
import { createWorker } from '@/worker'
import { activatePaidWithInvestment } from '@/use-cases/@Promotions/activate-paid-with-investment'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('F02 exige banco local descartável')
const db = new PrismaClient({ datasources: { db: { url } } })
const now = new Date('2026-10-16T12:00Z'), expiry = new Date('2026-10-18T12:00Z')
let tenant: string, owner: string, other: string, link: string, promotion: string, host: string
const actor = () => ({ tenantId: tenant, actorId: owner })
const messages: OutboundEmail[] = []
const deliver = async (mail: OutboundEmail) => { messages.push(mail) }
const cycle = () => runRenewalReminderCycle(db, { now, enabled: true, deliver })
async function enable() { return renewalPreferences(db, actor(), { emailRenewal: true, expectedVersion: 0 }) }
async function pendingFailure() { await runRenewalReminderCycle(db, { now, enabled: true, deliver: async () => { throw new Error('provider timeout') } }); await db.renewalReminder.updateMany({ where: { tenantId: tenant }, data: { nextAttemptAt: now } }) }
function token(id = owner, tid = tenant) { return app.jwt.sign({ sub: id, tenantId: tid, role: 'USER', typ: 'access' }) }
const headers = (id = owner, tid = tenant) => ({ host, authorization: 'Bearer ' + token(id, tid) })
beforeAll(async () => { setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); setRenewalReminderDbForTest(db); await app.ready() })
beforeEach(async () => {
  await db.user.updateMany({ where: { tenantId: { startsWith: 'f02-' } }, data: { emailRenewal: false } }); messages.length = 0
  tenant = 'f02-' + randomUUID(); owner = 'owner-' + tenant; other = 'other-' + tenant; host = tenant + '.test'; link = 'link-' + tenant; promotion = 'promotion-' + tenant
  await db.tenant.create({ data: { id: tenant, host, name: 'F02' } })
  for (const id of [owner, other]) await db.user.create({ data: { id, tenantId: tenant, name: id, passwordHash: 'fixture', identifiers: { create: { tenantId: tenant, kind: 'EMAIL', normalizedValue: id + '@example.test', confirmedAt: now } } } })
  await db.network.create({ data: { id: 'net-' + tenant, tenantId: tenant, name: 'Site', slug: 'site', knownHosts: [] } })
  await db.niche.create({ data: { id: 'niche-' + tenant, tenantId: tenant, name: 'Estudos', slug: 'estudos' } })
  await db.link.create({ data: { id: link, tenantId: tenant, ownerId: owner, networkId: 'net-' + tenant, nicheId: 'niche-' + tenant, canonicalUrl: 'https://example.com/' + tenant, name: 'Comunidade de estudos', description: 'Fixture', status: 'PUBLISHED', everPublished: true } })
  await db.promotion.create({ data: { id: promotion, tenantId: tenant, linkId: link, surface: 'SEARCH', status: 'ACTIVE', activatedAt: new Date('2026-10-11T12:00Z'), expiresAt: expiry } })
})
afterAll(async () => { setRenewalReminderDbForTest(null); await db.$disconnect() })
describe('F02 HTTP, PG e entrega', () => {
  it('F02-T04 opt-in começa desligado, persiste com CAS e GET não agenda', async () => {
    expect(await renewalPreferences(db, actor())).toMatchObject({ emailRenewal: false, expectedVersion: 0, frequency: 'ONCE_PER_EXPIRY' })
    expect((await readRenewalReminders(db, actor(), now)).reminders).toHaveLength(1)
    expect(await db.renewalReminder.count({ where: { tenantId: tenant } })).toBe(0)
    await cycle(); expect(messages).toHaveLength(0)
    expect(await enable()).toMatchObject({ emailRenewal: true, expectedVersion: 1 })
    await expect(renewalPreferences(db, actor(), { emailRenewal: false, expectedVersion: 0 })).rejects.toThrow('preferência mudou')
    expect((await renewalPreferences(db, actor())).emailRenewal).toBe(true)
    await renewalPreferences(db, actor(), { emailRenewal: true, expectedVersion: 1 })
    const audit = await db.auditLog.findMany({ where: { tenantId: tenant, action: 'notification.renewal_preference_changed' } })
    expect(audit).toHaveLength(1); expect(audit[0]!.before).toMatchObject({ emailRenewal: false }); expect(audit[0]!.after).toMatchObject({ emailRenewal: true })
  })
  it('F02-T01/I01 dois workers criam e enviam uma única intenção', async () => {
    await enable(); await Promise.all([cycle(), cycle()]); await cycle()
    expect(messages).toHaveLength(1); expect(messages[0]!.text).toContain('Nenhuma cobrança automática')
    expect(messages[0]!.text).toContain('São Paulo'); expect(messages[0]!.text).toContain('/destaque?renew=SEARCH')
    const rows = await db.renewalReminder.findMany({ where: { tenantId: tenant } }); expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ status: 'SENT', attempts: 1, payload: null })
  })
  it('F02-T01/I03 falha ambígua mantém corpo e chave duráveis na retentativa', async () => {
    await enable(); const accepted: OutboundEmail[] = []
    await runRenewalReminderCycle(db, { now, enabled: true, deliver: async mail => { accepted.push(mail); throw new Error('accepted then disconnected') } })
    await db.link.update({ where: { id: link }, data: { name: 'Título alterado depois da primeira tentativa' } })
    await db.renewalReminder.updateMany({ where: { tenantId: tenant }, data: { nextAttemptAt: now } }); await cycle()
    expect(messages).toHaveLength(1); expect(messages[0]).toEqual(accepted[0]); expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })).attempts).toBe(2)
  })
  it('F02-T02 cancelamento e renovação na fila impedem envio antigo', async () => {
    await enable(); await pendingFailure(); await db.promotion.update({ where: { id: promotion }, data: { status: 'CANCELLED' } }); await cycle()
    expect(messages).toHaveLength(0); expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })).status).toBe('SKIPPED')
    await db.promotion.update({ where: { id: promotion }, data: { status: 'ACTIVE', expiresAt: new Date('2026-10-20T12:00Z') } }); await cycle(); expect(messages).toHaveLength(0)
  })
  it('F02-T02 renovação paga real muda o vencimento e invalida a intenção', async () => {
    await enable(); await pendingFailure()
    const order = await db.order.create({ data: { tenantId: tenant, userId: owner, linkId: link, status: 'PAID', method: 'PIX', productCode: 'SEARCH', durationDays: 7, amountCents: 700, savingsCents: 0, renewal: true, surfaces: { create: { surface: 'SEARCH', linkId: link } } } })
    await activatePaidWithInvestment(db, order.id, now); await cycle()
    expect(messages).toHaveLength(0); expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })).status).toBe('SKIPPED')
    expect(await db.order.count({ where: { tenantId: tenant } })).toBe(1)
  })
  it('F02-T03 envio revalida opt-out e suspensão atuais', async () => {
    await enable(); await pendingFailure(); await renewalPreferences(db, actor(), { emailRenewal: false, expectedVersion: 1 }); await cycle(); expect(messages).toHaveLength(0)
    await renewalPreferences(db, actor(), { emailRenewal: true, expectedVersion: 2 }); await db.renewalReminder.deleteMany({ where: { tenantId: tenant } }); await pendingFailure()
    await db.user.update({ where: { id: owner }, data: { status: 'BANNED' } }); await cycle(); expect(messages).toHaveLength(0)
  })
  it('F02-T03 troca de e-mail invalida payload antigo sem entregar ao endereço anterior', async () => {
    await enable(); await pendingFailure(); await db.userIdentifier.updateMany({ where: { userId: owner }, data: { replacedAt: now } })
    await db.userIdentifier.create({ data: { userId: owner, tenantId: tenant, kind: 'EMAIL', normalizedValue: 'new-' + owner + '@example.test', confirmedAt: now } })
    await cycle(); expect(messages).toHaveLength(0); expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })).payload).toBeNull()
  })
  it('F02-T03 remoção do proprietário encerra intenção sem bloquear o lote', async () => {
    await enable(); await pendingFailure(); await db.link.update({ where: { id: link }, data: { ownerId: null } }); await cycle()
    expect(messages).toHaveLength(0); expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })).status).toBe('SKIPPED')
  })
  it('F02-T03 suspensão concorrente mantém ordem usuário/link sem deadlock', async () => {
    await enable(); await pendingFailure()
    let ready = () => {}, release = () => {}
    const started = new Promise<void>(resolve => { ready = resolve }), gate = new Promise<void>(resolve => { release = resolve })
    const suspension = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${owner} FOR UPDATE`
      ready(); await gate
      await tx.user.update({ where: { id: owner }, data: { status: 'BANNED' } })
      await tx.link.update({ where: { id: link }, data: { status: 'UNAVAILABLE' } })
    }, { timeout: 15000 })
    await started; const running = cycle()
    try {
      await expect.poll(async () => Number((await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM users%FOR SHARE%'`)[0]!.n)).toBeGreaterThan(0)
    } finally { release() }
    await Promise.all([suspension, running]); expect(messages).toHaveLength(0)
  })
  it('F02-T03 pausa F07 e indisponibilidade cancelam lembrete', async () => {
    await enable(); await pendingFailure(); await db.promotion.update({ where: { id: promotion }, data: { status: 'PAUSED' } }); await db.link.update({ where: { id: link }, data: { status: 'UNAVAILABLE' } }); await cycle(); expect(messages).toHaveLength(0)
    expect((await readRenewalReminders(db, actor(), now)).reminders).toHaveLength(0)
  })
  it('F02-T01 limita tentativas e não reenvia após a janela segura de idempotência', async () => {
    await enable(); await pendingFailure()
    for (let i = 0; i < 4; i++) await pendingFailure()
    expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } }))).toMatchObject({ attempts: 5, status: 'FAILED', payload: null })
    await cycle(); expect(messages).toHaveLength(0)
    await db.renewalReminder.updateMany({ where: { tenantId: tenant }, data: { status: 'PENDING', attempts: 1, firstAttemptAt: new Date(now.getTime() - 24 * 3600000) } }); await cycle()
    expect((await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })).status).toBe('SKIPPED')
  })
  it('F02-T03 não gera e-mail para admin, sem confirmação ou HOME inelegível', async () => {
    await enable(); await db.promotion.update({ where: { id: promotion }, data: { administrative: true } }); await cycle(); expect(messages).toHaveLength(0)
    await db.promotion.update({ where: { id: promotion }, data: { administrative: false, surface: 'HOME' } }); await db.niche.update({ where: { id: 'niche-' + tenant }, data: { requiresAge: true } }); await cycle(); expect(messages).toHaveLength(0)
    await db.promotion.update({ where: { id: promotion }, data: { surface: 'SEARCH' } }); await db.userIdentifier.updateMany({ where: { userId: owner }, data: { confirmedAt: null } }); await cycle(); expect(messages).toHaveLength(0)
  })
  it('F02-I02 HTTP exige sessão e isola dono/tenant/estado atual', async () => {
    const route = '/api/v1/promotions/mine/reminders'
    expect((await app.inject({ url: route, headers: { host } })).statusCode).toBe(401)
    const own = await app.inject({ url: route, headers: headers() }); expect(own.statusCode).toBe(200); expect(own.headers['cache-control']).toBe('private, no-store')
    expect(own.json().reminders[0].link.id).toBe(link)
    const stranger = await app.inject({ url: route, headers: headers(other) }); expect(stranger.json().reminders).toEqual([]); expect(stranger.body).not.toContain(promotion)
    expect((await app.inject({ url: route, headers: headers(owner, 'foreign') })).statusCode).toBe(403)
    await db.user.update({ where: { id: owner }, data: { status: 'BANNED' } }); expect((await app.inject({ url: route, headers: headers() })).statusCode).toBe(404)
  })
  it('F02-T04 HTTP valida body, versão e confirmação sem aceitar tenant do cliente', async () => {
    const route = '/api/v1/me/notification-preferences'
    expect((await app.inject({ method: 'PATCH', url: route, headers: headers(), payload: { emailRenewal: true, expectedVersion: 0, tenantId: tenant } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'PATCH', url: route, headers: headers(), payload: { emailRenewal: true, expectedVersion: 0 } })).statusCode).toBe(200)
    expect((await app.inject({ method: 'PATCH', url: route, headers: headers(), payload: { emailRenewal: false, expectedVersion: 0 } })).statusCode).toBe(409)
    await db.userIdentifier.updateMany({ where: { userId: other }, data: { confirmedAt: null } })
    expect((await app.inject({ method: 'PATCH', url: route, headers: headers(other), payload: { emailRenewal: true, expectedVersion: 0 } })).statusCode).toBe(409)
  })
  it('F02-T05 leitura, preferência e envio não criam pedido ou renovam', async () => {
    await enable(); await readRenewalReminders(db, actor(), now); await cycle()
    expect(await db.order.count({ where: { tenantId: tenant } })).toBe(0)
    expect((await db.promotion.findUniqueOrThrow({ where: { id: promotion } })).expiresAt).toEqual(expiry)
  })
  it('F02-PG01 unicidade de janela e FK composta protegem tenant', async () => {
    await enable(); await cycle(); const row = await db.renewalReminder.findFirstOrThrow({ where: { tenantId: tenant } })
    const data = { tenantId: tenant, promotionId: promotion, expiresAt: expiry, deliveryKey: randomUUID() }
    await expect(db.renewalReminder.create({ data })).rejects.toMatchObject({ code: 'P2002' })
    await expect(db.renewalReminder.create({ data: { ...data, tenantId: 'foreign', expiresAt: now } })).rejects.toMatchObject({ code: 'P2003' })
    expect(row.deliveryKey).toMatch(/^renewal\/[a-f0-9]{64}$/)
  })
  it('F02-I01 Redis e worker reais suportam reentrega sem duplicar', async () => {
    await enable(); const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null }), name = 'f02-worker-' + randomUUID()
    const worker = createWorker(connection, { textJudge: null, db, renewalReminders: { now, enabled: true, deliver } }, name)
    const queue = new Queue(name, { connection }), events = new QueueEvents(name, { connection })
    try { await events.waitUntilReady(); await worker.waitUntilReady(); for (let n = 0; n < 2; n++) { const job = await queue.add('renewal-reminder-cycle', {}); await job.waitUntilFinished(events, 10000) } expect(messages).toHaveLength(1) }
    finally { await worker.close(); await events.close(); await queue.obliterate({ force: true }); await queue.close(); await connection.quit() }
  })
  it('F02 rollout desligado preserva leitura/preferência sem agendar entrega', async () => {
    await enable(); expect(await runRenewalReminderCycle(db, { enabled: false, now, deliver })).toEqual({ sent: 0 }); expect(messages).toHaveLength(0)
    expect((await readRenewalReminders(db, actor(), now)).reminders).toHaveLength(1)
    await db.renewalReminder.create({ data: { tenantId: tenant, promotionId: promotion, expiresAt: now, deliveryKey: randomUUID(), status: 'FAILED', payload: Prisma.DbNull } })
  })
})
