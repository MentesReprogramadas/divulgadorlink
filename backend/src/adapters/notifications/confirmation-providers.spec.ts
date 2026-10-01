import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmationProviders,
  InboxConfirmationProvider,
  resilientConfirmationDelivery,
  UnselectedConfirmationProvider,
} from '@/adapters/notifications/confirmation-providers'
import {
  DeliveryUnavailableError,
  type EmailProvider,
  PROVIDER_SELECTION_REQUIRED,
} from '@/domain/notifications/confirmation-delivery'

const message = { userId: 'user-1', destination: 'ana@example.com', code: '482913' }

function capturedLogs(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((call: unknown[]) => String(call[0])).join('\n')
}

function sms(provider: EmailProvider) {
  return { EMAIL: new UnselectedConfirmationProvider('EMAIL'), PHONE: provider }
}

describe('entrega de código de confirmação', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('produção usa o provedor não selecionado e falha explícita sem retry', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const providers = confirmationProviders({ NODE_ENV: 'production' })
    expect(providers.EMAIL).toBeInstanceOf(UnselectedConfirmationProvider)
    expect(providers.PHONE).toBeInstanceOf(UnselectedConfirmationProvider)
    await expect(providers.EMAIL.sendConfirmationCode(message, new AbortController().signal))
      .rejects.toThrow(PROVIDER_SELECTION_REQUIRED)

    const deliver = resilientConfirmationDelivery(providers, { attempts: 3, backoffMs: 1 })
    const failure = await deliver('EMAIL', message).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(DeliveryUnavailableError)
    expect(failure).toMatchObject({ channel: 'EMAIL', reason: 'provider_selection_required' })
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('fora de produção usa o inbox de teste', () => {
    const providers = confirmationProviders({ NODE_ENV: 'dev' })
    expect(providers.EMAIL).toBeInstanceOf(InboxConfirmationProvider)
    expect(providers.PHONE).toBeInstanceOf(InboxConfirmationProvider)
  })

  it('refaz após falha transitória e registra as tentativas sem código nem destino', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const send = vi.fn()
      .mockRejectedValueOnce(new Error(`falhou para ${message.destination} com ${message.code}`))
      .mockResolvedValueOnce(undefined)
    const deliver = resilientConfirmationDelivery(sms({ sendConfirmationCode: send }), { attempts: 2, backoffMs: 1 })

    await deliver('PHONE', message)

    expect(send).toHaveBeenCalledTimes(2)
    const output = capturedLogs(log)
    expect(output).toContain('"status":"failure"')
    expect(output).toContain('"reason":"provider_error"')
    expect(output).toContain('"status":"success"')
    expect(output).not.toContain(message.code)
    expect(output).not.toContain(message.destination)
  })

  it('esgota as tentativas e devolve erro de provedor', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const send = vi.fn().mockRejectedValue(new Error('500'))
    const deliver = resilientConfirmationDelivery(sms({ sendConfirmationCode: send }), { attempts: 2, backoffMs: 1 })

    await expect(deliver('PHONE', message)).rejects.toMatchObject({ reason: 'provider_error' })
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('aborta provedor que não responde no prazo', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const signals: AbortSignal[] = []
    const hanging: EmailProvider = {
      sendConfirmationCode: (_message, signal) => {
        signals.push(signal)
        return new Promise(() => {})
      },
    }
    const deliver = resilientConfirmationDelivery(sms(hanging), { attempts: 2, timeoutMs: 20, backoffMs: 1 })

    await expect(deliver('PHONE', message)).rejects.toMatchObject({ reason: 'timeout' })
    expect(signals).toHaveLength(2)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
