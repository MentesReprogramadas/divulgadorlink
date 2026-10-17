import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { monitorPolicy, type MonitorPolicy } from '@/domain/links/availability-monitor'
import { PrismaLinkAvailabilityRepository } from '@/repositories/link-availability-repository'
import type { UrlProbe } from './link-availability'
import { probeAvailability } from '@/adapters/http/availability-probe'
import { deliverEmail, emailOutboxEnabled, configuredResend } from '@/adapters/notifications/outbound-mail'
import { availabilityEmail, emailBrand, siteOrigin } from '@/adapters/notifications/email/templates'
import type { OutboundEmail } from '@/adapters/notifications/resend-mailer'
import { logDomainEvent } from '@/observability/logger'

async function sendNotice(email: OutboundEmail) {
  if (!emailOutboxEnabled() && !configuredResend()) throw new Error('email_provider_unconfigured')
  await deliverEmail(email, AbortSignal.timeout(6000))
}
export async function deliverAvailabilityNotices(db: PrismaClient, now: Date, deliver: (email: OutboundEmail) => Promise<void> = sendNotice) {
  const notices = await db.linkAvailability.findMany({ where: { notificationPendingAt: { not: null }, notificationSentAt: null, notificationAttempts: { lt: 5 }, notificationNextAt: { lte: now }, disabledAt: { not: null }, link: { owner: { status: 'ACTIVE' }, status: 'UNAVAILABLE' } }, orderBy: { notificationNextAt: 'asc' }, take: 20, include: { tenant: true, link: { include: { owner: { include: { identifiers: true } } } } } })
  let sent = 0
  for (const notice of notices) {
    // A durable lease prevents parallel workers from sending the same notice concurrently.
    const heldUntil = new Date(now.getTime() + 120000)
    const claimed = await db.linkAvailability.updateMany({ where: { linkId: notice.linkId, notificationPendingAt: notice.notificationPendingAt, notificationSentAt: null, notificationNextAt: { lte: now } }, data: { notificationNextAt: heldUntil, notificationAttempts: { increment: 1 } } })
    if (!claimed.count) continue
    const email = notice.link.owner?.identifiers.find(row => row.kind === 'EMAIL' && row.confirmedAt !== null && row.replacedAt === null)?.normalizedValue
    if (!email) { logDomainEvent('availability.notice.failed', { entity: notice.linkId, result: 'no_confirmed_email' }); continue }
    const body = availabilityEmail({ brand: emailBrand({ name: notice.tenant.name, host: notice.tenant.host }), linkName: notice.link.name, url: siteOrigin(notice.tenant.host) + '/painel/links/' + notice.linkId + '/disponibilidade' })
    const payloadHash = createHash('sha256').update(JSON.stringify({ email, ...body })).digest('hex').slice(0, 24)
    try {
      await deliver({ to: email, kind: 'availability', ...body, idempotencyKey: 'availability/' + notice.linkId + '/' + notice.disabledAt!.getTime() + '/' + payloadHash })
      await db.linkAvailability.updateMany({ where: { linkId: notice.linkId, notificationPendingAt: notice.notificationPendingAt, notificationNextAt: heldUntil }, data: { notificationSentAt: now, notificationNextAt: null } })
      sent += 1
    } catch {
      await db.linkAvailability.updateMany({ where: { linkId: notice.linkId, notificationPendingAt: notice.notificationPendingAt, notificationNextAt: heldUntil }, data: { notificationNextAt: new Date(now.getTime() + Math.min(3600000, 60000 * 2 ** notice.notificationAttempts)) } })
      logDomainEvent('availability.notice.failed', { entity: notice.linkId, result: 'provider_error' })
    }
  }
  return sent
}

export type AvailabilityCycleInput = { now?: Date; policy?: MonitorPolicy; probe?: UrlProbe; deliver?: (email: OutboundEmail) => Promise<void> }
export async function runAvailabilityCycle(db: PrismaClient, input: AvailabilityCycleInput = {}) {
  const policy = input.policy ?? monitorPolicy(process.env)
  if (!policy.enabled) return { checked: 0, sent: 0 }
  const clock = () => input.now ?? new Date()
  const repository = new PrismaLinkAvailabilityRepository(db)
  await repository.initialize(clock())
  let checked = 0
  for (const due of await repository.due(clock())) {
    if (checked >= 20) break
    const claim = await repository.claim(due.tenantId, due.linkId, clock(), policy)
    if (!claim) continue
    const status = await (input.probe ?? probeAvailability)(claim.canonicalUrl)
    if (await repository.observe(claim, status, clock(), policy)) checked += 1
  }
  const sent = await deliverAvailabilityNotices(db, clock(), input.deliver)
  logDomainEvent('availability.cycle', { checked, sent, result: 'completed' })
  return { checked, sent }
}
