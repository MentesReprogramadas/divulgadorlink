import { ResendMailer, type OutboundEmail } from '@/adapters/notifications/resend-mailer'
import {
  accountDeletedEmail,
  banEmail,
  emailBrand,
  type EmailBrand,
  moderationEmail,
  type ModerationOutcome,
  passwordResetEmail,
  siteOrigin,
} from '@/adapters/notifications/email/templates'
import { ProviderSelectionRequiredError } from '@/domain/notifications/confirmation-delivery'
import { logDomainEvent } from '@/observability/logger'

const outbox: OutboundEmail[] = []

export function emailOutboxEnabled(nodeEnv = process.env): boolean {
  return nodeEnv.EMAIL_OUTBOX === '1' && nodeEnv.NODE_ENV !== 'production'
}

export function stashOutbound(email: OutboundEmail): void {
  if (!emailOutboxEnabled()) return
  outbox.push(email)
  if (outbox.length > 100) outbox.splice(0, outbox.length - 100)
}

export function readOutbound(to: string): OutboundEmail[] {
  if (!emailOutboxEnabled()) return []
  return outbox.filter((email) => email.to === to)
}

export function resetOutboundForTest(): void {
  outbox.length = 0
}

export function configuredResend(nodeEnv = process.env): ResendMailer | null {
  if (!nodeEnv.RESEND_API_KEY || !nodeEnv.EMAIL_FROM) return null
  return new ResendMailer(nodeEnv.RESEND_API_KEY, nodeEnv.EMAIL_FROM)
}

export async function deliverEmail(email: OutboundEmail, signal?: AbortSignal): Promise<void> {
  if (emailOutboxEnabled()) {
    stashOutbound(email)
    return
  }
  const mailer = configuredResend()
  if (mailer) {
    await mailer.send(email, signal)
    return
  }
  if (process.env.NODE_ENV === 'production') {
    throw new ProviderSelectionRequiredError('EMAIL')
  }
  logDomainEvent('notification.skipped', { channel: 'EMAIL', kind: email.kind, reason: 'unconfigured' })
}

async function sendQuiet(email: OutboundEmail): Promise<void> {
  try {
    await deliverEmail(email, AbortSignal.timeout(5_000))
  } catch {
    logDomainEvent('notification.delivery', {
      channel: 'EMAIL',
      kind: email.kind,
      status: 'failure',
      reason: 'provider_error',
    })
  }
}

function brandOf(input: { name: string; host: string }): EmailBrand {
  return emailBrand({ name: input.name, host: input.host })
}

export async function notifyPasswordReset(input: { to: string; url: string; name: string; host: string }): Promise<void> {
  const rendered = passwordResetEmail({ brand: brandOf(input), url: input.url })
  await deliverEmail({ to: input.to, kind: 'password_reset', ...rendered }, AbortSignal.timeout(5_000))
}

export async function notifyModeration(input: {
  to: string | null
  name: string
  host: string
  linkName: string
  outcome: ModerationOutcome
}): Promise<void> {
  if (!input.to) return
  const rendered = moderationEmail({ brand: brandOf(input), linkName: input.linkName, outcome: input.outcome })
  await sendQuiet({ to: input.to, kind: 'moderation', ...rendered })
}

export async function notifyBan(input: {
  to: string | null
  name: string
  host: string
  reason?: string
}): Promise<void> {
  if (!input.to) return
  const rendered = banEmail({ brand: brandOf(input), reason: input.reason })
  await sendQuiet({ to: input.to, kind: 'ban', ...rendered })
}

export async function notifyAccountDeleted(input: {
  to: string | null
  name: string
  host: string
  accountName: string
}): Promise<void> {
  if (!input.to) return
  const rendered = accountDeletedEmail({ brand: brandOf(input), name: input.accountName })
  await sendQuiet({ to: input.to, kind: 'account_deleted', ...rendered })
}

export function publicResetUrl(host: string, token: string): string {
  return `${siteOrigin(host)}/recuperar-senha?token=${encodeURIComponent(token)}`
}
