import { stashConfirmation } from '@/adapters/auth/confirmation-inbox'
import {
  type ConfirmationChannel,
  type ConfirmationDelivery,
  type ConfirmationMessage,
  type DeliveryFailureReason,
  DeliveryUnavailableError,
  type EmailProvider,
  ProviderSelectionRequiredError,
  type SmsProvider,
} from '@/domain/notifications/confirmation-delivery'
import { logDomainEvent } from '@/observability/logger'

type ConfirmationProvider = EmailProvider | SmsProvider

export class InboxConfirmationProvider implements EmailProvider, SmsProvider {
  constructor(private readonly channel: ConfirmationChannel) {}

  async sendConfirmationCode(message: ConfirmationMessage): Promise<void> {
    stashConfirmation(message.userId, this.channel, message.code)
  }
}

export class UnselectedConfirmationProvider implements EmailProvider, SmsProvider {
  constructor(private readonly channel: ConfirmationChannel) {}

  async sendConfirmationCode(): Promise<void> {
    throw new ProviderSelectionRequiredError(this.channel)
  }
}

export type ConfirmationProviders = { EMAIL: EmailProvider; PHONE: SmsProvider }

export function confirmationProviders(env: NodeJS.ProcessEnv = process.env): ConfirmationProviders {
  if (env.NODE_ENV === 'production') {
    return { EMAIL: new UnselectedConfirmationProvider('EMAIL'), PHONE: new UnselectedConfirmationProvider('PHONE') }
  }
  return { EMAIL: new InboxConfirmationProvider('EMAIL'), PHONE: new InboxConfirmationProvider('PHONE') }
}

export type DeliveryOptions = {
  attempts?: number
  timeoutMs?: number
  backoffMs?: number
}

function failureReason(error: unknown): DeliveryFailureReason {
  if (error instanceof ProviderSelectionRequiredError) return 'provider_selection_required'
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 'timeout'
  return 'provider_error'
}

async function sendWithTimeout(
  provider: ConfirmationProvider,
  message: ConfirmationMessage,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController()
  let timer: NodeJS.Timeout | undefined
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error('timeout')
      error.name = 'TimeoutError'
      controller.abort(error)
      reject(error)
    }, timeoutMs)
  })
  try {
    await Promise.race([provider.sendConfirmationCode(message, controller.signal), expired])
  } finally {
    clearTimeout(timer)
  }
}

export function resilientConfirmationDelivery(
  providers: ConfirmationProviders,
  options: DeliveryOptions = {},
): ConfirmationDelivery {
  const attempts = options.attempts ?? 2
  const timeoutMs = options.timeoutMs ?? 5_000
  const backoffMs = options.backoffMs ?? 250

  return async (channel, message) => {
    const provider = providers[channel]
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const started = Date.now()
      try {
        await sendWithTimeout(provider, message, timeoutMs)
        logDomainEvent('notification.delivery', {
          channel,
          attempt,
          status: 'success',
          duration_ms: Date.now() - started,
        })
        return
      } catch (error) {
        const reason = failureReason(error)
        logDomainEvent('notification.delivery', {
          channel,
          attempt,
          status: 'failure',
          reason,
          duration_ms: Date.now() - started,
        })
        if (reason === 'provider_selection_required' || attempt === attempts) {
          throw new DeliveryUnavailableError(channel, reason)
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt))
      }
    }
  }
}

export const defaultConfirmationDelivery: ConfirmationDelivery = (channel, message) =>
  resilientConfirmationDelivery(confirmationProviders())(channel, message)
