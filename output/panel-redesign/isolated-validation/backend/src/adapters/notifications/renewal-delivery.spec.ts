import { afterEach, describe, expect, it, vi } from 'vitest'
import { deliverRenewalReminder } from './renewal-delivery'
import { deliverEmail } from './outbound-mail'
vi.mock('./outbound-mail', () => ({ configuredResend: () => null, emailOutboxEnabled: () => false, deliverEmail: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks() })
const email = { to: 'fixture@example.test', kind: 'renewal_reminder' as const, subject: 'Fixture', html: '<p>Fixture</p>', text: 'Fixture', idempotencyKey: 'renewal/fixture' }
describe('F02 transporte de lembrete', () => {
  it('produção ignora adapter E2E e não afirma envio sem provedor', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('E2E_RENEWAL_MAIL_URL', 'http://127.0.0.1:4199/renewal-mail')
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(deliverRenewalReminder(email)).rejects.toThrow('não configurado'); expect(fetch).not.toHaveBeenCalled(); expect(deliverEmail).not.toHaveBeenCalled()
  })
  it('fixture externo ao computador é recusado', async () => {
    vi.stubEnv('NODE_ENV', 'dev'); vi.stubEnv('E2E_RENEWAL_MAIL_URL', 'https://example.com/mail')
    await expect(deliverRenewalReminder(email)).rejects.toThrow('local')
  })
  it('falha HTTP do fixture propaga para retry, com chave intacta', async () => {
    vi.stubEnv('NODE_ENV', 'dev'); vi.stubEnv('E2E_RENEWAL_MAIL_URL', 'http://127.0.0.1:4199/mail')
    const fetch = vi.fn().mockResolvedValue({ ok: false }); vi.stubGlobal('fetch', fetch)
    await expect(deliverRenewalReminder(email)).rejects.toThrow('indisponível')
    expect(fetch.mock.calls[0]![1].headers['idempotency-key']).toBe(email.idempotencyKey)
  })
})
