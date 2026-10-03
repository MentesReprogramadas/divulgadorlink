import { describe, expect, it } from 'vitest'
import {
  accountDeletedEmail,
  banEmail,
  moderationEmail,
  otpEmail,
  passwordResetEmail,
} from '@/adapters/notifications/email/templates'

const brand = { name: 'Tem Link Aqui', logoUrl: 'https://temlinkaqui.com/logo.svg' }

describe('modelos de e-mail', () => {
  it('otp não coloca o código no assunto', () => {
    const email = otpEmail({ brand, code: '482913' })
    expect(email.subject).not.toContain('482913')
    expect(email.html).toContain('482913')
    expect(email.text).toContain('1 hora')
  })

  it('senha leva o link uma vez', () => {
    const email = passwordResetEmail({ brand, url: 'https://temlinkaqui.com/recuperar-senha?token=abc' })
    expect(email.html).toContain('https://temlinkaqui.com/recuperar-senha?token=abc')
    expect(email.text).toContain('30 minutos')
  })

  it('moderação escapa o nome do link', () => {
    const email = moderationEmail({ brand, linkName: '<script>', outcome: 'rejected' })
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).not.toContain('<script>')
    expect(email.subject).toContain('Link não publicado')
  })

  it('banimento inclui o motivo e a exclusão cita o nome', () => {
    expect(banEmail({ brand, reason: 'golpe' }).text).toContain('golpe')
    expect(banEmail({ brand }).text).not.toContain('Motivo')
    expect(accountDeletedEmail({ brand, name: 'Ana' }).text).toContain('Ana, a conta foi excluída.')
  })
})
