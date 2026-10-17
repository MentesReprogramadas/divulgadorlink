import { Prisma, type PrismaClient } from '@prisma/client'
import { RENEWAL_LEAD_MS, dueForRenewal, renewalReminderPolicy, renewalWindowKey } from '@/domain/notifications/renewal-reminder'
import { assertCheckout } from '@/domain/promotions/eligibility'
import { analyticsDay } from '@/domain/analytics/day'
import { promotionPerformance } from '@/use-cases/@Analytics/promotion-performance'
import { PrismaPromotionPerformanceRepository } from '@/repositories/promotion-performance-repository'
import { renewalReminderEmail, emailBrand, siteOrigin } from '@/adapters/notifications/email/templates'
import { deliverRenewalReminder } from '@/adapters/notifications/renewal-delivery'
import type { OutboundEmail } from '@/adapters/notifications/resend-mailer'
import { logDomainEvent } from '@/observability/logger'
import { PrismaAuditLogsRepository } from '@/repositories/audit-logs-repository'

type Actor = { tenantId: string; actorId: string; requestId?: string }
type Tx = Prisma.TransactionClient
export class RenewalReminderError extends Error {
  constructor(readonly status: 404 | 409, message = 'Recurso não encontrado.') { super(message) }
}
async function currentActor(tx: Tx, input: Actor, write = false) {
  if (write) await tx.$queryRaw`SELECT id FROM users WHERE id=${input.actorId} AND "tenantId"=${input.tenantId} FOR UPDATE`
  const user = await tx.user.findFirst({ where: { id: input.actorId, tenantId: input.tenantId, status: 'ACTIVE' }, include: { identifiers: true } })
  if (!user) throw new RenewalReminderError(404)
  return user
}
const preferences = (user: { emailRenewal: boolean; notificationVersion: number }) => ({ emailRenewal: user.emailRenewal, expectedVersion: user.notificationVersion, leadDays: 3, frequency: 'ONCE_PER_EXPIRY' as const })
export async function renewalPreferences(db: PrismaClient, input: Actor, patch?: { emailRenewal: boolean; expectedVersion: number }) {
  return db.$transaction(async tx => {
    const user = await currentActor(tx, input, Boolean(patch))
    if (!patch) return preferences(user)
    if (patch.expectedVersion !== user.notificationVersion) throw new RenewalReminderError(409, 'A preferência mudou. Atualize e tente novamente.')
    if (patch.emailRenewal && !user.identifiers.some(i => i.tenantId === input.tenantId && i.kind === 'EMAIL' && i.confirmedAt && !i.replacedAt)) throw new RenewalReminderError(409, 'Confirme seu e-mail antes de ativar os lembretes.')
    if (patch.emailRenewal === user.emailRenewal) return preferences(user)
    const updated = await tx.user.update({ where: { id: user.id }, data: { emailRenewal: patch.emailRenewal, notificationVersion: { increment: 1 } } })
    await new PrismaAuditLogsRepository(tx).create({ tenantId: input.tenantId, actorId: user.id, action: 'notification.renewal_preference_changed', entityType: 'USER', entityId: user.id, before: { emailRenewal: user.emailRenewal, version: user.notificationVersion }, after: { emailRenewal: updated.emailRenewal, version: updated.notificationVersion }, requestId: input.requestId ?? null })
    return preferences(updated)
  }, { timeout: 10000, maxWait: 5000 })
}
const windowWhere = (now: Date) => ({ status: 'ACTIVE' as const, administrative: false, expiresAt: { gt: now, lte: new Date(now.getTime() + RENEWAL_LEAD_MS) } })
function renewPath(linkId: string, surface: string) { return '/painel/links/' + encodeURIComponent(linkId) + '/destaque?renew=' + surface }
async function summary(db: PrismaClient, input: Actor & { linkId: string; promotionId: string }, now: Date) {
  const view = await promotionPerformance({ ...input, to: analyticsDay(now) }, new PrismaPromotionPerformanceRepository(db), now)
  if (!view) return null
  return { from: view.from, to: view.to, impressions: view.totals.impressions, clicks: view.totals.clicks, dataState: view.dataState, coverage: view.coverage.status }
}
export async function readRenewalReminders(db: PrismaClient, input: Actor, now = new Date()) {
  const user = await currentActor(db, input)
  const rows = await db.promotion.findMany({ where: { tenantId: input.tenantId, ...windowWhere(now), link: { ownerId: user.id, tenantId: input.tenantId, status: 'PUBLISHED' }, NOT: { surface: 'HOME', link: { niche: { requiresAge: true } } } }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: 50, select: { id: true, surface: true, expiresAt: true, link: { select: { id: true, name: true } } } })
  return { preferences: preferences(user), reminders: await Promise.all(rows.map(async p => ({ promotionId: p.id, link: p.link, surface: p.surface, expiresAt: p.expiresAt!.toISOString(), status: 'DUE', renewPath: renewPath(p.link.id, p.surface), resultPath: '/painel/links/' + encodeURIComponent(p.link.id) + '/resultado', summary: await summary(db, { ...input, linkId: p.link.id, promotionId: p.id }, now) }))) }
}

async function initialize(db: PrismaClient, now: Date) {
  // NOT EXISTS avoids repeatedly selecting already delivered windows and starving later accounts.
  const rows = await db.$queryRaw<Array<{ id: string; tenantId: string; expiresAt: Date }>>`SELECT p.id,p."tenantId",p."expiresAt" FROM promotions p JOIN links l ON l.id=p."linkId" AND l."tenantId"=p."tenantId" JOIN users u ON u.id=l."ownerId" AND u."tenantId"=p."tenantId" WHERE p.status='ACTIVE' AND NOT p.administrative AND p."expiresAt">${now} AND p."expiresAt"<=${new Date(now.getTime() + RENEWAL_LEAD_MS)} AND l.status='PUBLISHED' AND u.status='ACTIVE' AND u."emailRenewal" AND EXISTS (SELECT 1 FROM user_identifiers i WHERE i."userId"=u.id AND i."tenantId"=u."tenantId" AND i.kind='EMAIL' AND i."confirmedAt" IS NOT NULL AND i."replacedAt" IS NULL) AND NOT EXISTS (SELECT 1 FROM renewal_reminders r WHERE r."tenantId"=p."tenantId" AND r."promotionId"=p.id AND r."expiresAt"=p."expiresAt" AND r.channel='EMAIL') ORDER BY p."expiresAt",p.id LIMIT 100`
  if (rows.length) await db.renewalReminder.createMany({ data: rows.map(p => ({ tenantId: p.tenantId, promotionId: p.id, expiresAt: p.expiresAt, deliveryKey: renewalWindowKey(p.tenantId, p.id, p.expiresAt), nextAttemptAt: now, createdAt: now })), skipDuplicates: true })
}
async function lockedContext(tx: Tx, id: string, now: Date) {
  const first = await tx.renewalReminder.findUnique({ where: { id }, include: { promotion: { include: { link: true } } } })
  if (!first) return null
  if (!first.promotion.link.ownerId) {
    await tx.renewalReminder.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'SKIPPED', payload: Prisma.DbNull } })
    return null
  }
  // Same link lock as payment activation, pause and URL recovery. Preference changes lock the user exclusively.
  await tx.$queryRaw`SELECT id FROM users WHERE id=${first.promotion.link.ownerId} AND "tenantId"=${first.tenantId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM links WHERE id=${first.promotion.linkId} AND "tenantId"=${first.tenantId} FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM renewal_reminders WHERE id=${id} FOR UPDATE`
  const row = await tx.renewalReminder.findUniqueOrThrow({ where: { id }, include: { promotion: { include: { tenant: true, link: { include: { niche: true, owner: { include: { identifiers: true } } } } } } } })
  if (row.status !== 'PENDING' || row.nextAttemptAt > now) return null
  const p = row.promotion, user = p.link.owner
  const identifier = user?.identifiers.find(i => i.tenantId === row.tenantId && i.kind === 'EMAIL' && i.confirmedAt && !i.replacedAt)
  let eligible = Boolean(user?.emailRenewal && identifier && p.link.tenantId === row.tenantId && user.tenantId === row.tenantId && p.expiresAt?.getTime() === row.expiresAt.getTime() && dueForRenewal({ ...p, accountStatus: user.status, linkStatus: p.link.status }, now))
  try { assertCheckout({ account: user?.status ?? 'BANNED', link: p.link.status === 'PUBLISHED' ? 'PUBLISHED' : 'UNAVAILABLE', requiresAge: p.link.niche.requiresAge, surfaces: [p.surface], activeSurfaces: [], pendingSurfaces: [] }) } catch { eligible = false }
  if (!eligible || !identifier || (row.firstAttemptAt && now.getTime() - row.firstAttemptAt.getTime() >= 23 * 3600000)) {
    await tx.renewalReminder.update({ where: { id }, data: { status: 'SKIPPED', payload: Prisma.DbNull } }); return null
  }
  await tx.$queryRaw`SELECT id FROM user_identifiers WHERE id=${identifier.id} FOR SHARE`
  const current = await tx.userIdentifier.findUnique({ where: { id: identifier.id } })
  if (!current?.confirmedAt || current.replacedAt || current.normalizedValue !== identifier.normalizedValue) {
    await tx.renewalReminder.update({ where: { id }, data: { status: 'SKIPPED', payload: Prisma.DbNull } }); return null
  }
  return { row, p, user: user!, email: identifier.normalizedValue }
}
function storedPayload(value: Prisma.JsonValue): OutboundEmail {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ['to', 'subject', 'html', 'text', 'idempotencyKey'].some(k => typeof value[k] !== 'string') || value.kind !== 'renewal_reminder') throw new Error('payload de lembrete inválido')
  return value as unknown as OutboundEmail
}
export type RenewalCycleInput = { now?: Date; enabled?: boolean; deliver?: (email: OutboundEmail) => Promise<void> }
export async function runRenewalReminderCycle(db: PrismaClient, input: RenewalCycleInput = {}) {
  if (!(input.enabled ?? renewalReminderPolicy(process.env).enabled)) return { sent: 0 }
  const clock = () => input.now ?? new Date()
  const now = clock()
  await initialize(db, now)
  const due = await db.renewalReminder.findMany({ where: { status: 'PENDING', attempts: { lt: 5 }, nextAttemptAt: { lte: now } }, orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }], take: 25, select: { id: true } })
  let sent = 0
  for (const { id } of due) {
    // Commit the first payload before contacting the provider, so crash recovery reuses its exact body/key.
    await db.$transaction(async tx => {
      const context = await lockedContext(tx, id, clock()); if (!context || context.row.payload) return
      const { row, p, user, email } = context
      const result = await summary(db, { tenantId: row.tenantId, actorId: user.id, linkId: p.linkId, promotionId: p.id }, clock())
      const body = renewalReminderEmail({ brand: emailBrand({ name: p.tenant.name }), linkName: p.link.name, surface: p.surface, expiresAt: row.expiresAt, summary: result, url: siteOrigin(p.tenant.host) + renewPath(p.linkId, p.surface), preferencesUrl: siteOrigin(p.tenant.host) + '/painel/lembretes' })
      const payload: OutboundEmail = { to: email, kind: 'renewal_reminder', ...body, idempotencyKey: row.deliveryKey }
      await tx.renewalReminder.update({ where: { id }, data: { firstAttemptAt: clock(), payload: payload as unknown as Prisma.InputJsonValue } })
    }, { timeout: 15000 })
    const delivered = await db.$transaction(async tx => {
      const context = await lockedContext(tx, id, clock()); if (!context) return false
      const payload = storedPayload(context.row.payload)
      if (payload.to !== context.email) { await tx.renewalReminder.update({ where: { id }, data: { status: 'SKIPPED', payload: Prisma.DbNull } }); return false }
      const attempts = context.row.attempts + 1
      try {
        await (input.deliver ?? deliverRenewalReminder)(payload)
        await tx.renewalReminder.update({ where: { id }, data: { attempts, status: 'SENT', sentAt: clock(), payload: Prisma.DbNull } })
        return true
      } catch {
        await tx.renewalReminder.update({ where: { id }, data: { attempts, status: attempts >= 5 ? 'FAILED' : 'PENDING', ...(attempts >= 5 ? { payload: Prisma.DbNull } : {}), nextAttemptAt: new Date(clock().getTime() + 60000 * 2 ** (attempts - 1)) } })
        logDomainEvent('renewal.reminder.failed', { entity: id, result: 'provider_error' }); return false
      }
    }, { timeout: 15000, maxWait: 5000 })
    if (delivered) sent += 1
  }
  await db.renewalReminder.deleteMany({ where: { status: { not: 'PENDING' }, expiresAt: { lt: new Date(now.getTime() - 30 * 86400000) } } })
  logDomainEvent('renewal.reminder.cycle', { sent, result: 'completed' })
  return { sent }
}
