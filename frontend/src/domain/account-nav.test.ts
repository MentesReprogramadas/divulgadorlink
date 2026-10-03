import { describe, expect, it } from 'vitest'
import { accountLinks, isSignedIn } from './account-nav'

describe('navegação da conta', () => {
  it('mostra entrar e criar conta sem papel', () => {
    expect(isSignedIn(undefined)).toBe(false)
    expect(accountLinks(undefined)).toEqual([
      { href: '/login', label: 'Entrar' },
      { href: '/cadastro', label: 'Criar conta' },
    ])
  })

  it('troca o header para o painel quando o cookie de papel existe', () => {
    expect(accountLinks('USER')).toEqual([{ href: '/painel', label: 'Painel' }])
    expect(accountLinks('ADMIN')).toEqual([
      { href: '/painel', label: 'Painel' },
      { href: '/admin/visao', label: 'Admin' },
    ])
    expect(accountLinks('')).toEqual([
      { href: '/login', label: 'Entrar' },
      { href: '/cadastro', label: 'Criar conta' },
    ])
  })
})
