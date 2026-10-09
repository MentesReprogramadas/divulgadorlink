import { describe, expect, it } from 'vitest'
import { AD_FORBIDDEN_PATTERN, advertiseCta } from './advertise'

describe('destino do anúncio', () => {
  it('manda quem não tem sessão para o cadastro', () => {
    expect(advertiseCta(null)).toEqual({ href: '/cadastro', label: 'Publicar um link' })
  })

  it('manda quem não confirmou o e-mail para a verificação', () => {
    expect(advertiseCta({ canSubmit: false })).toEqual({ href: '/painel/verificar', label: 'Confirmar e-mail' })
  })

  it('manda quem já pode enviar para o formulário', () => {
    expect(advertiseCta({ canSubmit: true })).toEqual({ href: '/painel/links/novo', label: 'Publicar um link' })
  })

  it('recusa o vocabulário restrito', () => {
    for (const sample of ['Adulto 18+', 'Apostas', 'Ganhar Dinheiro', 'OnlyFans', 'Fansly', 'Fatal Model', 'Privacy']) {
      expect(AD_FORBIDDEN_PATTERN.test(sample)).toBe(true)
    }
    expect(AD_FORBIDDEN_PATTERN.test('Publicar um link')).toBe(false)
  })
})
