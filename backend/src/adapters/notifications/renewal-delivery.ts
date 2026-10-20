import { configuredResend, deliverEmail, emailOutboxEnabled } from './outbound-mail'
import type { OutboundEmail } from './resend-mailer'

export async function deliverQueuedEmail(email: OutboundEmail): Promise<void> {
  // External provider fixture, restricted to local non-production harnesses.
  const fixture = process.env.E2E_RENEWAL_MAIL_URL
  if (process.env.NODE_ENV !== 'production' && fixture) {
    const url = new URL(fixture)
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('fixture deve ser local')
    const result = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': email.idempotencyKey! }, body: JSON.stringify(email), signal: AbortSignal.timeout(5000) })
    if (!result.ok) throw new Error('fixture indisponível')
    return
  }
  if (!configuredResend() && !emailOutboxEnabled()) throw new Error('provedor de e-mail não configurado')
  await deliverEmail(email, AbortSignal.timeout(5000))
}

export {deliverQueuedEmail as deliverRenewalReminder}
