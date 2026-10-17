import { describe, expect, it } from 'vitest'
import { parseSummary } from '@/domain/catalog/index-policy'
import { INITIAL_NICHES, INITIAL_NETWORKS } from '@/domain/catalog/initial-facets'
import { facetSummaryTables, summaryToApply } from '@/domain/catalog/default-facet-summaries'

const SNIPPET_MAX = 160

function expectSeoCopy(kind: 'niche' | 'network', rows: Array<{ slug: string; requiresAge: boolean; isPublicFacet: boolean }>) {
  const table = facetSummaryTables[kind]
  for (const row of rows) {
    const text = table[row.slug]
    if (row.requiresAge || !row.isPublicFacet) {
      expect(text, row.slug).toBeUndefined()
      continue
    }
    expect(text, row.slug).toBeTruthy()
    expect(text!.length, `${row.slug} ${text!.length}`).toBeGreaterThanOrEqual(80)
    expect(text!.length, `${row.slug} ${text!.length}`).toBeLessThanOrEqual(SNIPPET_MAX)
    expect(parseSummary(text!).ok, row.slug).toBe(true)
  }
}

describe('resumos padrão do catálogo', () => {
  it('cobre só o que pode entrar na busca, com texto único de snippet', () => {
    expectSeoCopy('niche', INITIAL_NICHES)
    expectSeoCopy('network', INITIAL_NETWORKS)
    const texts = [
      ...Object.values(facetSummaryTables.niche),
      ...Object.values(facetSummaryTables.network),
    ]
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('não substitui texto já gravado nem preenche 18+ e catálogo oculto', () => {
    expect(summaryToApply('niche', {
      slug: 'esportes', summary: 'texto que já está no ar', requiresAge: false, isPublicFacet: true,
    })).toBeNull()
    expect(summaryToApply('niche', {
      slug: 'adulto', summary: null, requiresAge: true, isPublicFacet: true,
    })).toBeNull()
    expect(summaryToApply('network', {
      slug: 'outro', summary: null, requiresAge: false, isPublicFacet: false,
    })).toBeNull()
    expect(summaryToApply('niche', {
      slug: 'jogos', summary: null, requiresAge: false, isPublicFacet: true,
    })).toMatch(/jogos/i)
  })
})
