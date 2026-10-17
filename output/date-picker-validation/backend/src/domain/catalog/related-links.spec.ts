import { describe, expect, it } from 'vitest'
import { selectRelated, encodeRelatedCursor, decodeRelatedCursor } from './related-links'
const source = { id: 'source', tenantId: 'a', canonicalUrl: 'https://example.com/source', nicheId: 'n1', networkId: 'r1' }
const candidate = { ...source, id: 'one', canonicalUrl: 'https://example.com/one', status: 'PUBLISHED', ownerStatus: 'ACTIVE', requiresAge: false }
const context = { ...source, age: 'unknown' as const }
describe('F03 relações públicas e cursor', () => {
  it('F03-U05 embaralha empates por abertura e mantém a mesma ordem dentro do cursor', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ ...candidate, id: 'item-' + i, canonicalUrl: 'https://example.com/' + i }))
    const a = selectRelated(rows, source, 'no', '0'.repeat(32)).map(r => r.id)
    expect(selectRelated([...rows].reverse(), source, 'no', '0'.repeat(32)).map(r => r.id)).toEqual(a)
    expect(selectRelated(rows, source, 'no', '1'.repeat(32)).map(r => r.id)).not.toEqual(a)
    expect(new Set(a).size).toBe(30)
  })
  it('F03-U01 exclui próprio, duplicado, indisponível e tenant alheio', () => {
    const rows = [candidate, { ...candidate, id: 'two' }, { ...candidate, id: 'other-url', canonicalUrl: source.canonicalUrl }, { ...candidate, id: source.id }, { ...candidate, id: 'foreign', tenantId: 'b' }, { ...candidate, id: 'off', status: 'UNAVAILABLE' }, { ...candidate, id: 'banned', ownerStatus: 'BANNED' }]
    expect(selectRelated(rows, source, 'unknown').map(r => r.id)).toEqual(['one'])
  })
  it('F03-U02/U03 ordena nicho/rede e desempata por ID', () => {
    const rows = [
      { ...candidate, id: 'z', canonicalUrl: 'https://example.com/z' },
      { ...candidate, id: 'a', canonicalUrl: 'https://example.com/a' },
      { ...candidate, id: 'niche', canonicalUrl: 'https://example.com/n', networkId: 'r2' },
      { ...candidate, id: 'network', canonicalUrl: 'https://example.com/r', nicheId: 'n2' },
      { ...candidate, id: 'unrelated', canonicalUrl: 'https://example.com/u', nicheId: 'n2', networkId: 'r2' },
    ]
    expect(selectRelated(rows, source, 'unknown').map(r => r.id)).toEqual(['a', 'z', 'niche', 'network'])
  })
  it('F03-U01 exige aceite de idade para candidato restrito', () => {
    expect(selectRelated([{ ...candidate, requiresAge: true }], source, 'no')).toEqual([])
    expect(selectRelated([{ ...candidate, requiresAge: true }], source, 'yes')).toHaveLength(1)
  })
  it('F03 cursor vincula fonte, tenant e idade; adulteração é recusada', () => {
    const token = encodeRelatedCursor({ rank: 1, id: 'one', seed: '0'.repeat(32) }, context, 'secret')
    expect(decodeRelatedCursor(token, context, 'secret')).toEqual({ rank: 1, id: 'one', seed: '0'.repeat(32) })
    for (const changed of [{ ...context, tenantId: 'b' }, { ...context, id: 'other' }, { ...context, age: 'yes' as const }, { ...context, nicheId: 'n2' }]) expect(() => decodeRelatedCursor(token, changed, 'secret')).toThrow()
    expect(() => decodeRelatedCursor(token + 'x', context, 'secret')).toThrow()
    expect(() => decodeRelatedCursor('x'.repeat(2049), context, 'secret')).toThrow()
  })
})
