import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { rankHome, rankNiche, rankSearch, resolveSearchTarget, visibleForAge, hybridSearchSql, relevanceScore, autocompleteIds } from '@/use-cases/@Search/rank-links'

const rows = [
  { id: 'novo', relevance: 0.95, searchActivatedAt: new Date('2026-09-02'), homeActivatedAt: null, nicheActivatedAt: null, requiresAge: false },
  { id: 'antigo', relevance: 0.4, searchActivatedAt: new Date('2026-09-01'), homeActivatedAt: null, nicheActivatedAt: null, requiresAge: false },
  { id: 'org', relevance: 0.9, searchActivatedAt: null, homeActivatedAt: null, nicheActivatedAt: new Date('2026-09-01'), requiresAge: false },
  { id: 'baixo', relevance: 0.1, searchActivatedAt: null, homeActivatedAt: null, nicheActivatedAt: null, requiresAge: false },
  { id: 'adulto', relevance: 0.99, searchActivatedAt: null, homeActivatedAt: null, nicheActivatedAt: null, requiresAge: true },
]

describe('busca', () => {
  it('tira o patrocinado do orgânico e ordena o bloco pela ativação', () => {
    const result = rankSearch(visibleForAge(rows, 'yes'), 0.2)
    expect(result.sponsored.map((link) => link.id)).toEqual(['antigo', 'novo'])
    expect(result.organic.map((link) => link.id)).toEqual(['adulto', 'org'])
  })

  it('omite o nicho com idade antes de qualquer campo, sem avisar o que saiu', () => {
    const visible = visibleForAge(rows, 'no')
    expect(visible.map((link) => link.id)).not.toContain('adulto')
    expect(JSON.stringify(visible)).not.toContain('adulto')
  })

  it('não promove NICHE na busca de nome livre', () => {
    const result = rankSearch(visibleForAge(rows, 'yes'), 0.2)
    expect(result.sponsored.map((link) => link.id)).not.toContain('org')
  })

  it('abre a página do nicho quando a consulta é o nicho', () => {
    expect(resolveSearchTarget('Apostas', [{ slug: 'apostas', name: 'Apostas' }], [])).toEqual({
      kind: 'niche', slug: 'apostas',
    })
  })

  it('home paga ordena pela ativação e não usa o corte da busca', () => {
    const home = rankHome([
      { id: 'b', relevance: 0.1, homeActivatedAt: new Date('2026-09-02') },
      { id: 'a', relevance: 0.9, homeActivatedAt: new Date('2026-09-01') },
      { id: 'org', relevance: 0.5, homeActivatedAt: null },
    ])
    expect(home.sponsored.map((link) => link.id)).toEqual(['a', 'b'])
    expect(home.organic.map((link) => link.id)).toEqual(['org'])
  })

  it('nicho pago usa a ativação da superfície e o mesmo ranking da home', () => {
    const niche = rankNiche([
      { id: 'b', relevance: 0.2, nicheActivatedAt: new Date('2026-09-03') },
      { id: 'a', relevance: 0.8, nicheActivatedAt: new Date('2026-09-01') },
    ])
    expect(niche.sponsored.map((link) => link.id)).toEqual(['a', 'b'])
  })

  it('a nota híbrida usa os pesos recebidos e não aumenta porque houve pagamento', () => {
    expect(relevanceScore(0.5, 1, 0.4, 0.6)).toBeCloseTo(0.8)
    const paid = rankSearch([
      { id: 'pago', relevance: 0.4, searchActivatedAt: new Date('2026-09-01'), requiresAge: false },
      { id: 'org', relevance: 0.4, searchActivatedAt: null, requiresAge: false },
    ], 0.4)
    expect(paid.sponsored[0]?.relevance).toBe(paid.organic[0]?.relevance)
  })

  it('autocomplete devolve no máximo 8 e não chama modelo', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `id-${index}`,
      relevance: 1 - index / 100,
      searchActivatedAt: null,
      requiresAge: false,
    }))
    expect(autocompleteIds(many, 0.2)).toHaveLength(8)
    const source = readFileSync(path.join(__dirname, 'rank-links.ts'), 'utf8')
    expect(source).not.toContain('openai')
    expect(source).not.toContain('chat')
  })

  it('a SQL filtra idade e limiar e não descarta link sem vetor', () => {
    const sql = hybridSearchSql()
    expect(sql).toContain('requiresAge')
    expect(sql).toContain('>= $7')
    expect(sql).not.toContain('embedding" IS NOT NULL')
    expect(sql).toContain('embedding" IS NULL')
  })
})
