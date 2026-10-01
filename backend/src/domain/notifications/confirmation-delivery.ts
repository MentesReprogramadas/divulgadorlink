export type ConfirmationChannel = 'EMAIL' | 'PHONE'

export type ConfirmationMessage = {
  userId: string
  destination: string
  code: string
}

export interface EmailProvider {
  sendConfirmationCode(message: ConfirmationMessage, signal: AbortSignal): Promise<void>
}

export interface SmsProvider {
  sendConfirmationCode(message: ConfirmationMessage, signal: AbortSignal): Promise<void>
}

export const PROVIDER_SELECTION_REQUIRED = 'PROVIDER_SELECTION_REQUIRED'

export class ProviderSelectionRequiredError extends Error {
  constructor(readonly channel: ConfirmationChannel) {
    super(`${PROVIDER_SELECTION_REQUIRED}: nenhum provedor de ${channel === 'EMAIL' ? 'e-mail' : 'SMS'} configurado.`)
  }
}

export type DeliveryFailureReason = 'provider_selection_required' | 'timeout' | 'provider_error'

export class DeliveryUnavailableError extends Error {
  constructor(
    readonly channel: ConfirmationChannel,
    readonly reason: DeliveryFailureReason,
  ) {
    super('Envio de código indisponível.')
  }
}

export type ConfirmationDelivery = (
  channel: ConfirmationChannel,
  message: ConfirmationMessage,
) => Promise<void>
