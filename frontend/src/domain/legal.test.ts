import { describe, expect, it } from 'vitest'
import { legalPages } from './legal'

describe('texto legal', () => {
  const pages = legalPages('contato@example.com')

  it('não promete expurgo de pagamento', () => {
    expect(pages.privacy).not.toMatch(/apagamos pedidos/i)
    expect(pages.privacy).toContain('12 meses')
    expect(pages.privacy).toContain('contato@example.com')
  })

  it('identifica a empresa e não publica o endereço', () => {
    for (const page of [pages.privacy, pages.terms]) {
      expect(page).toContain('CONTAVERA SOLUCOES INTELIGENTES LTDA')
      expect(page).toContain('66.421.121/0001-15')
      expect(page).toContain('comercial@contavera.com')
      expect(page).not.toMatch(/\d{5}-?\d{3}/)
      expect(page).not.toMatch(/\(\d{2}\)\s*\d/)
    }
  })

  it('diz que publicar é grátis e que a análise é humana', () => {
    expect(pages.terms).toContain('Publicar é grátis')
    expect(pages.terms).toContain('análise humana')
    expect(pages.terms).toContain('destaque')
  })

  it('tira o destino do link da jurisdição da plataforma', () => {
    expect(pages.terms).toContain('fora da jurisdição')
    expect(pages.privacy).toContain('fora da jurisdição')
    expect(pages.terms).toContain('não controlamos')
    expect(pages.privacy).toContain('não controlamos')
  })

  it('cita só os tratamentos que existem e não elege foro', () => {
    expect(pages.privacy).toContain('Stripe')
    expect(pages.privacy).toContain('Woovi')
    expect(pages.privacy).toContain('Meta')
    expect(pages.privacy).toContain('processo diário')
    expect(pages.privacy).toContain('Gerenciar cookies')
    expect(pages.privacy).toContain('só é gravado depois do aceite')
    expect(pages.privacy).not.toContain('não controla esse registro')
    expect(pages.terms).not.toMatch(/foro/i)
    for (const page of [pages.privacy, pages.terms]) {
      expect(page).not.toMatch(/didit|gerencianet|efí|google analytics|codeqr|statsig|popunder|bet\.br/i)
    }
  })
})
