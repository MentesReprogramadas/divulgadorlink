import { describe, expect, it } from 'vitest'
import { afterAuth, panelGate } from './panel-gate'

const open = { status: 'ACTIVE', canSubmit: true }
const pending = { status: 'ACTIVE', canSubmit: false }
const banned = { status: 'BANNED', canSubmit: false }

it('abre administração para admin e Meus links para usuário, preservando verificação e retornos',()=>{
 expect(afterAuth(true,'ACTIVE',undefined,'ADMIN')).toBe('/admin/visao')
 expect(afterAuth(true,'ACTIVE',undefined,'USER')).toBe('/painel')
 expect(afterAuth(false,'ACTIVE',undefined,'ADMIN')).toBe('/painel/verificar')
 expect(afterAuth(true,'BANNED',undefined,'ADMIN')).toBe('/painel')
 expect(afterAuth(true,'ACTIVE','/painel/denunciar/link-1','ADMIN')).toBe('/painel/denunciar/link-1')
})

it('retoma convite de equipe depois do login sem aceitar destinos extras',()=>{
 const target='/equipe/convite?scope=workspace&token='+'a'.repeat(43)
 expect(afterAuth(true,'ACTIVE',target)).toBe(target)
 expect(afterAuth(false,'ACTIVE',target)).toBe('/painel/verificar')
 expect(afterAuth(true,'BANNED',target)).toBe('/painel')
 expect(afterAuth(true,'ACTIVE',target+'&next=https://evil.test')).toBe('/painel')
})

describe('porta do painel', () => {
  it('F06 retoma a denúncia após entrar, preservando verificação e suspensão', () => {
    expect(afterAuth(true, 'ACTIVE', '/painel/denunciar/link-1')).toBe('/painel/denunciar/link-1')
    expect(afterAuth(false, 'ACTIVE', '/painel/denunciar/link-1')).toBe('/painel/verificar')
    expect(afterAuth(true, 'BANNED', '/painel/denunciar/link-1')).toBe('/painel')
    for (const target of ['https://evil.test', '//evil.test', '/painel/denunciar/../admin', '/admin', '/painel/denunciar/%2f%2fevil.test']) expect(afterAuth(true, 'ACTIVE', target)).toBe('/painel')
  })
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
    expect(afterAuth(false, 'BANNED')).toBe('/painel')
  })
})

it('F20 convite volta ao caminho local após login, mantendo verificação e bloqueando redirects',()=>{const target='/equipe/convite?token='+'a'.repeat(43);expect(afterAuth(true,'ACTIVE',target)).toBe(target);expect(afterAuth(false,'ACTIVE',target)).toBe('/painel/verificar');for(const unsafe of [target+'&next=//evil.test','https://evil.test/equipe/convite','//evil.test',target+'%0A'])expect(afterAuth(true,'ACTIVE',unsafe)).toBe('/painel')})
