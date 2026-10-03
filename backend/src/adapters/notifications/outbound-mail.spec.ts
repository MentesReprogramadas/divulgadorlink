import { afterEach, describe, expect, it, vi } from 'vitest'
import { emailOutboxEnabled, readOutbound, resetOutboundForTest } from '@/adapters/notifications/outbound-mail'
import { notifyAccountDeleted, notifyBan, notifyModeration, publicResetUrl } from '@/adapters/notifications/outbound-mail'

describe('caixa de saída', () => {
  afterEach(() => {
    delete process.env.EMAIL_OUTBOX
    resetOutboundForTest()
    vi.restoreAllMocks()
  })

  it('produção ignora a caixa mesmo com a flag', () => {
    expect(emailOutboxEnabled({ EMAIL_OUTBOX: '1', NODE_ENV: 'production' })).toBe(false)
    expect(emailOutboxEnabled({ EMAIL_OUTBOX: '1', NODE_ENV: 'dev' })).toBe(true)
  })

  it('avisos de moderação, banimento e exclusão ficam na caixa sem derrubar a ação', async () => {
    process.env.EMAIL_OUTBOX = '1'
    await notifyModeration({
      to: 'ana@example.com',
      name: 'Tem Link Aqui',
      host: 'temlinkaqui.com',
      linkName: 'Receitas',
      outcome: 'published',
    })
    await notifyBan({ to: 'ana@example.com', name: 'Tem Link Aqui', host: 'temlinkaqui.com', reason: 'golpe' })
    await notifyAccountDeleted({
      to: 'ana@example.com',
      name: 'Tem Link Aqui',
      host: 'temlinkaqui.com',
      accountName: 'Ana',
    })
    await notifyModeration({ to: null, name: 'Tem Link Aqui', host: 'temlinkaqui.com', linkName: 'x', outcome: 'rejected' })

    const messages = readOutbound('ana@example.com')
    expect(messages.map((email) => email.kind)).toEqual(['moderation', 'ban', 'account_deleted'])
    expect(messages[0]?.html).toContain('logo-dark-mode-removebg.png')
    expect(messages[0]?.html).not.toContain('logo-white-mode-removebg.png')
    expect(messages[0]?.html).toContain('bgcolor="#0a192f"')
    expect(messages[0]?.text).toContain('Receitas')
    expect(messages[1]?.text).toContain('golpe')
    expect(publicResetUrl('temlinkaqui.com', 'abc')).toBe('http://temlinkaqui.com/recuperar-senha?token=abc')
  })
})
