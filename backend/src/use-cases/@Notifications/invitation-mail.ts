import type { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { configuredResend, deliverEmail, emailOutboxEnabled } from '@/adapters/notifications/outbound-mail'
import { emailBrand, invitationEmail, siteOrigin } from '@/adapters/notifications/email/templates'
import { logDomainEvent } from '@/observability/logger'

export type InvitationKind = 'workspace_invitation' | 'profile_invitation' | 'agency_access' | 'ownership_transfer'

export async function sendInvitationEmail(db: PrismaClient, input: {
  tenantId: string
  kind: InvitationKind
  requestId: string
  token?: string
} & ({ email: string; userId?: never } | { userId: string; email?: never })): Promise<'sent' | 'failed'> {
  try {
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: input.tenantId } })
    const identifier = input.email ? null : await db.userIdentifier.findFirst({
      where: { tenantId: input.tenantId, userId: input.userId, kind: 'EMAIL', replacedAt: null, confirmedAt: { not: null } },
    })
    const to = input.email?.trim().toLowerCase() ?? identifier?.normalizedValue
    if (!to || (!emailOutboxEnabled() && !configuredResend())) throw new Error('email_unavailable')
    const url = new URL(input.kind === 'agency_access' ? '/painel/clientes/acessos'
      : input.kind === 'ownership_transfer' ? '/painel/clientes/transferencias' : '/equipe/convite', siteOrigin(tenant.host))
    if (input.kind === 'workspace_invitation') url.searchParams.set('scope', 'workspace')
    if (input.token) url.searchParams.set('token', input.token)
    const rendered = invitationEmail({ brand: emailBrand({ name: tenant.name }), kind: input.kind, url: url.href })
    await deliverEmail({ to, kind: input.kind, ...rendered,
      idempotencyKey: createHash('sha256').update(`${input.tenantId}:${input.kind}:${input.requestId}`).digest('hex'),
    }, AbortSignal.timeout(5_000))
    return 'sent'
  } catch {
    logDomainEvent('notification.delivery', { channel: 'EMAIL', kind: input.kind, status: 'failure', reason: 'provider_error' })
    return 'failed'
  }
}
