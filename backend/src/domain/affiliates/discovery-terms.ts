// One search per run keeps a full 24-term rotation within the 24-hour cache TTL.
import { isPetSegment, petSearchTerm } from './segment-relevance'
export const MAX_DISCOVERY_TERMS = 24

const giftTerms = [
  'Camiseta masculina', 'Tênis feminino', 'Brinquedo educativo', 'Kit perfume',
  'Jogo de panelas', 'Fone bluetooth', 'Vestido feminino', 'Tênis masculino',
  'Jogo de construção', 'Kit cuidados com a pele', 'Jogo de cama',
  'Caixa de som bluetooth', 'Mochila esportiva', 'Smartwatch',
]
const christmasDecorTerms = ['Árvore de Natal', 'Pisca pisca Natal', 'Enfeites de Natal', 'Guirlanda de Natal']
const normalize = (term: string) => term.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim()

export function planAffiliateDiscoveryTerms(seeds: string[], expanded: string[] = [], segmentName=''): string[] {
  const normalized = seeds.map(normalize)
  // Explicit decoration-only or product-specific searches retain their scope.
  const christmas = normalized.some(term => term === 'natal' || /^(presentes?|ideias de presentes?)( de| para o)? natal$/.test(term))
  const gifts = christmas || normalized.some(term => /^(presentes?|ideias de presentes?)$/.test(term))
  const candidates = [...seeds, ...(gifts ? giftTerms : []), ...(christmas ? christmasDecorTerms : []), ...expanded]
  const seen = new Set<string>()
  const pet=isPetSegment({name:segmentName,discovery:{terms:seeds}})
  return candidates.map(term => pet?petSearchTerm(term.trim()):term.trim()).filter(term => {
    const key = normalize(term)
    if (term.length < 2 || term.length > 120 || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, MAX_DISCOVERY_TERMS)
}
