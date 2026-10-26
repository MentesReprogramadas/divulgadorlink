import { describe, expect, it } from 'vitest'
import {
  cleanSummary,
  documentTitle,
  facetBlurb,
  facetIndexable,
  facetRobots,
  linkRobots,
  parseSummary,
  substantiveText,
} from '@/domain/catalog/index-policy'

const fat = 'a'.repeat(80)

describe('régua de índice', () => {
  it('exige 80 caracteres diferentes do nome', () => {
    expect(substantiveText('Jogos', 'a'.repeat(79))).toBe(false)
    expect(substantiveText('Jogos', fat)).toBe(true)
    expect(substantiveText(fat, `  ${fat}  `)).toBe(false)
  })

  it('faceta exige inventário elegível e aprovação editorial, com prévia para restrição de idade', () => {
    const base = { isPublicFacet: true, requiresAge: false }
    expect(facetIndexable(base)).toBe(false)
    const eligible = { ...base, eligibleCount: 1, editorialApproved: true }
    expect(facetIndexable(eligible)).toBe(true)
    expect(facetIndexable({ ...eligible, eligibleCount: 0 })).toBe(false)
    expect(facetIndexable({ ...eligible, editorialApproved: false })).toBe(false)
    expect(facetIndexable({ ...eligible, requiresAge: true })).toBe(false)
    expect(facetIndexable({ ...eligible, requiresAge: true, hasPublicPreview: true })).toBe(true)
    expect(facetIndexable({ ...eligible, isPublicFacet: false })).toBe(false)
  })

  it('separa público, filtrado e bloqueado', () => {
    const open = { isPublicFacet: true, requiresAge: false, filtered: false, eligibleCount: 1, editorialApproved: true }
    expect(facetRobots(open)).toBe('index,follow')
    expect(facetRobots({ ...open, filtered: true })).toBe('noindex,follow')
    expect(facetRobots({ ...open, requiresAge: true })).toBe('noindex,nofollow')
    expect(facetRobots({ ...open, isPublicFacet: false })).toBe('noindex,nofollow')
    expect(facetRobots({ ...open, eligibleCount: 0 })).toBe('noindex,follow')
    expect(facetRobots({ ...open, requiresAge: true, hasPublicPreview: true })).toBe('index,follow')
  })

  it('link público entra sem exigência de tamanho do texto', () => {
    expect(linkRobots({ blocked: false })).toBe('index,follow')
    expect(linkRobots({ blocked: true })).toBe('noindex,nofollow')
  })

  it('título, resumo e frase automática', () => {
    expect(documentTitle('home', 'Tem Link Aqui', 'Tem Link Aqui')).toBe('Tem Link Aqui')
    expect(documentTitle('named', 'Jogos', 'Tem Link Aqui')).toBe('Jogos | Tem Link Aqui')
    expect(facetBlurb('niche', 'Jogos', null)).toBe('Links de Jogos organizados por rede.')
    expect(facetBlurb('network', 'Telegram', null)).toBe('Links publicados em Telegram.')
    expect(facetBlurb('niche', 'Jogos', '  texto único  ')).toBe('texto único')
    expect(cleanSummary('   ')).toBeNull()
    expect(parseSummary(null)).toEqual({ ok: true, summary: null })
    expect(parseSummary('  ')).toEqual({ ok: true, summary: null })
    expect(parseSummary('a'.repeat(501)).ok).toBe(false)
    expect(parseSummary('oi <b>').ok).toBe(false)
    expect(parseSummary(fat)).toEqual({ ok: true, summary: fat })
  })
})
