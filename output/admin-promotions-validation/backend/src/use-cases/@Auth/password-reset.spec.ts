import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetOutboundForTest, readOutbound } from '@/adapters/notifications/outbound-mail'
import {
  hashResetToken,
  MemoryPasswordResetStore,
  requestPasswordReset,
  resetPassword,
  resetPasswordResetForTest,
  testPasswordAccounts,
} from '@/use-cases/@Auth/password-reset'

describe('recuperação de senha', () => {
  const store = new MemoryPasswordResetStore(() => 1_000)

  beforeEach(() => {
    resetPasswordResetForTest()
    resetOutboundForTest()
    process.env.EMAIL_OUTBOX = '1'
    store.reset()
  })

  afterEach(() => {
    delete process.env.EMAIL_OUTBOX
    resetOutboundForTest()
  })

  it('troca a senha uma vez e esquece o token', async () => {
    await store.save('ana', hashResetToken('token-1'), 60)
    expect(await store.consume(hashResetToken('token-1'))).toBe('ana')
    expect(await store.consume(hashResetToken('token-1'))).toBeNull()
  })

  it('um pedido novo invalida o token anterior', async () => {
    await store.save('ana', hashResetToken('velho'), 60)
    await store.save('ana', hashResetToken('novo'), 60)
    expect(await store.consume(hashResetToken('velho'))).toBeNull()
    expect(await store.consume(hashResetToken('novo'))).toBe('ana')
  })

  it('e-mail desconhecido não envia e o conhecido recebe o link', async () => {
    testPasswordAccounts().users.set('ana', {
      tenantId: 'tenant',
      email: 'ana@example.com',
      passwordHash: 'hash',
    })

    await requestPasswordReset({
      tenantId: 'tenant',
      tenantName: 'Tem Link Aqui',
      host: 'temlinkaqui.com',
      email: 'ninguém@example.com',
      token: 'token-ausente-com-mais-de-vinte',
    })
    expect(readOutbound('ninguém@example.com')).toEqual([])

    await requestPasswordReset({
      tenantId: 'tenant',
      tenantName: 'Tem Link Aqui',
      host: 'temlinkaqui.com',
      email: 'Ana@Example.com',
      token: 'token-ana-com-mais-de-vinte',
    })
    const sent = readOutbound('ana@example.com')
    expect(sent).toHaveLength(1)
    expect(sent[0]?.text).toContain('token-ana-com-mais-de-vinte')
    expect(sent[0]?.kind).toBe('password_reset')

    expect(await resetPassword({ token: 'token-ana-com-mais-de-vinte', passwordHash: 'nova' })).toBe(true)
    expect(testPasswordAccounts().users.get('ana')?.passwordHash).toBe('nova')
    expect(await resetPassword({ token: 'token-ana-com-mais-de-vinte', passwordHash: 'outra' })).toBe(false)
  })
})
