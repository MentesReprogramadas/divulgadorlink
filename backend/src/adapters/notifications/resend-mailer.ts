export type EmailKind = 'otp' | 'password_reset' | 'moderation' | 'ban' | 'account_deleted'

export type OutboundEmail = {
  to: string
  subject: string
  html: string
  text: string
  kind: EmailKind
}

export interface Mailer {
  send(email: OutboundEmail, signal?: AbortSignal): Promise<void>
}

export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(email: OutboundEmail, signal?: AbortSignal): Promise<void> {
    const response = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      signal,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })
    if (!response.ok) {
      if (response.status === 422) {
        const detail = await response.text()
        if (/from/i.test(detail)) {
          const rejected = new Error('remetente rejeitado')
          rejected.name = 'SenderRejectedError'
          throw rejected
        }
      }
      throw new Error(`resend_${response.status}`)
    }
  }
}
