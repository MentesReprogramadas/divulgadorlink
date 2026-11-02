import { describe, expect, it } from 'vitest'
import { MAX_DISCOVERY_TERMS, planAffiliateDiscoveryTerms } from './discovery-terms'

describe('affiliate discovery term planning', () => {
  it('inclui categorias de Pets antes de expansões repetitivas de ração',()=>{
    const terms=planAffiliateDiscoveryTerms(['Pets'],Array.from({length:20},(_,i)=>`Ração para gato ${i}`),'Pets')
    expect(terms).toEqual(expect.arrayContaining(['Areia higiênica para gatos','Comedouro para pets','Arranhador para gatos','Brinquedos para cachorros','Luva escova para pets','Cama para pets']))
    expect(terms.indexOf('Comedouro para pets')).toBeLessThan(terms.indexOf('Ração para gato 0'))
    expect(terms.length).toBeLessThanOrEqual(MAX_DISCOVERY_TERMS)
  })
  it('mantém coleta de gatos dentro da espécie e preserva campanhas que não são Pets',()=>{
    expect(planAffiliateDiscoveryTerms(['Gatos'],[],'Gatos')).toContain('Arranhador para gatos')
    expect(planAffiliateDiscoveryTerms(['Gatos'],[],'Gatos').some(t=>t.includes('cachorro'))).toBe(false)
    expect(planAffiliateDiscoveryTerms(['Informática'],['Mouse gamer'],'Informática')).toEqual(['Informática','Mouse gamer'])
  })
  it('covers gifts across categories and decoration without AI or Christmas-only searches', () => {
    const terms = planAffiliateDiscoveryTerms(['Natal'])
    expect(terms).toEqual(expect.arrayContaining(['Natal', 'Camiseta masculina', 'Tênis feminino', 'Brinquedo educativo', 'Kit perfume', 'Jogo de panelas', 'Fone bluetooth', 'Árvore de Natal']))
    expect(terms.filter(term => !term.includes('Natal'))).toHaveLength(14)
    expect(terms).toEqual(planAffiliateDiscoveryTerms(['Natal']))
  })
  it('reserves diverse deterministic searches before repetitive AI suggestions', () => {
    const seeds = ['Presentes de Natal', 'Decoração de Natal', 'Roupas', 'Beleza', 'Eletrônicos']
    const terms = planAffiliateDiscoveryTerms(seeds, Array.from({ length: 30 }, (_, i) => `Chaveiro de Natal ${i}`))
    expect(terms.slice(0, 5)).toEqual(seeds)
    expect(terms).toHaveLength(MAX_DISCOVERY_TERMS)
    expect(terms).toContain('Smartwatch')
    expect(terms).toContain('Guirlanda de Natal')
    expect(terms.filter(term => term.startsWith('Chaveiro'))).toHaveLength(1)
  })
  it('does not broaden narrow decoration or unrelated campaigns', () => {
    for (const term of ['Decoração de Natal', 'Chaveiro de Natal', 'Roupas infantis', 'Dia das Mães']) {
      expect(planAffiliateDiscoveryTerms([term], [term, 'Sugestão específica'])).toEqual([term, 'Sugestão específica'])
    }
  })
  it('normalizes duplicates and supports general gifts without seasonal decoration', () => {
    const terms = planAffiliateDiscoveryTerms([' Presentes ', 'Tênis feminino'], ['tenis feminino', '', 'x'.repeat(121)])
    expect(terms[0]).toBe('Presentes')
    expect(terms.filter(term => /t[eê]nis feminino/i.test(term))).toHaveLength(1)
    expect(terms).not.toContain('Árvore de Natal')
    expect(terms.every(term => term.length >= 2 && term.length <= 120)).toBe(true)
  })
})
