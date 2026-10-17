import { describe, expect, it } from 'vitest'
import { profileSlug } from './profile'

describe('F09 contratos independentes da decisão de moderação', () => {
  it('F09-U01/T01 normaliza caixa e bordas sem transformar nomes distintos em outro slug', () => {
    expect(profileSlug('  Meu-Perfil  ')).toBe('meu-perfil')
    expect(profileSlug('criador123')).toBe('criador123')
  })
  it.each(['admin', 'api', 'painel', 'login', 'cadastro', 'suporte', 'temlinkaqui', 'p', 'ab', '-perfil', 'perfil-', 'a--b', 'José', 'meu perfil', 'a'.repeat(41)])('F09-U01 recusa reservado ou inválido: %s', value => {
    expect(() => profileSlug(value)).toThrow()
  })
})
