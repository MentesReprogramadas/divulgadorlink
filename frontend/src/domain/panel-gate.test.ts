import { describe, expect, it } from 'vitest'
import { afterAuth, panelGate } from './panel-gate'

const open = { status: 'ACTIVE', canSubmit: true }
const pending = { status: 'ACTIVE', canSubmit: false }
const banned = { status: 'BANNED', canSubmit: false }

describe('porta do painel', () => {
  it('manda quem não confirmou o e-mail para a tela de verificar', () => {
    expect(panelGate(pending, '/painel')).toBe('redirect-verify')
    expect(panelGate(pending, '/painel/links/novo')).toBe('redirect-verify')
    expect(panelGate(pending, '/painel/verificar')).toBe('verify')
    expect(panelGate(null, '/painel')).toBe('login')
  })

  it('deixa quem já confirmou no painel e não prende conta suspensa na verificação', () => {
    expect(panelGate(open, '/painel')).toBe('panel')
    expect(panelGate(open, '/painel/verificar')).toBe('verify')
    expect(panelGate(banned, '/painel')).toBe('panel')
    expect(afterAuth(false)).toBe('/painel/verificar')
    expect(afterAuth(true)).toBe('/painel')
  })
})
