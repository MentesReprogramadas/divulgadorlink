import { describe, expect, it } from 'vitest'
import { orderIds, profileSlug } from './profile'

describe('F09 contratos independentes da decisão de moderação', () => {
  it('F09-U01/T01 normaliza caixa e bordas sem transformar nomes distintos em outro slug', () => {
    expect(profileSlug('  Meu-Perfil  ')).toBe('meu-perfil')
    expect(profileSlug('criador123')).toBe('criador123')
  })
  it.each(['admin', 'api', 'painel', 'login', 'cadastro', 'suporte', 'temlinkaqui', 'p', 'ab', '-perfil', 'perfil-', 'a--b', 'José', 'meu perfil', 'a'.repeat(41)])('F09-U01 recusa reservado ou inválido: %s', value => {
    expect(() => profileSlug(value)).toThrow()
  })
  it('F09-U02 conserva todos os IDs exatamente uma vez ao ordenar', () => {
    const current = ['grupo-a', 'grupo-b', 'grupo-c']
    expect(orderIds(current, ['grupo-c', 'grupo-a', 'grupo-b'])).toEqual(['grupo-c', 'grupo-a', 'grupo-b'])
    expect(current).toEqual(['grupo-a', 'grupo-b', 'grupo-c'])
    expect(orderIds([], [])).toEqual([])
  })
  it.each([['a', 'a'], ['a'], ['a', 'outro'], ['a', 'b', 'c']])('F09-U02 recusa omissão, repetição e inclusão de ID alheio: %j', (...requested) => {
    expect(() => orderIds(['a', 'b'], requested)).toThrow()
  })
})
