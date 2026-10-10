export const NETWORK_LEAD = ['telegram', 'discord', 'x'] as const
export const NICHE_LEAD = ['jogos', 'musicas', 'filmes-series', 'educacao-cursos'] as const
export const DEFERRED_FACET_SLUGS = [
  'adulto',
  'apostas',
  'ganhar-dinheiro',
  'onlyfans',
  'fansly',
  'fatal-model',
  'privacy',
] as const

const EXPLORE_NETWORK_SECOND = ['instagram', 'whatsapp', 'youtube', 'tiktok', 'facebook']
const EXPLORE_MILD_NICHES = ['jogos', 'musicas', 'filmes-series', 'educacao-cursos', 'futebol', 'esportes']

export function isDeferredFacet(slug: string): boolean {
  return (DEFERRED_FACET_SLUGS as readonly string[]).includes(slug)
}

export function deferredFacets<T extends { slug: string }>(items: T[]): T[] {
  return DEFERRED_FACET_SLUGS.flatMap((slug) => items.filter((item) => item.slug === slug))
}

function inView<T extends { slug: string }>(items: T[], active: string | null): T[] {
  return items.filter((item) => item.slug === active || !isDeferredFacet(item.slug))
}

export function leadFirst<T extends { slug: string; requiresAge?: boolean }>(
  items: T[],
  pins: readonly string[],
  active: string | null,
): T[] {
  const pool = inView(items, active)
  const lead = pins.flatMap((slug) => pool.filter((item) => item.slug === slug))
  const used = new Set(lead.map((item) => item.slug))
  const rest = pool.filter((item) => !used.has(item.slug))
  const ordered = [...lead, ...rest.filter((item) => item.requiresAge), ...rest.filter((item) => !item.requiresAge)]
  if (!active || used.has(active)) return ordered
  const index = ordered.findIndex((item) => item.slug === active)
  if (index < 0 || index <= lead.length) return ordered
  const [current] = ordered.splice(index, 1)
  ordered.splice(lead.length, 0, current!)
  return ordered
}

export function exploreNetworks<T extends { slug: string; requiresAge?: boolean }>(items: T[]): { lead: T[]; second: T[]; deferred: T[] } {
  const pool = inView(items, null)
  const secondSlugs = new Set(EXPLORE_NETWORK_SECOND)
  const second = EXPLORE_NETWORK_SECOND.flatMap((slug) => pool.filter((item) => item.slug === slug))
  const rest = pool.filter((item) => !secondSlugs.has(item.slug))
  const lead = NETWORK_LEAD.flatMap((slug) => rest.filter((item) => item.slug === slug))
  const used = new Set(lead.map((item) => item.slug))
  const tail = rest.filter((item) => !used.has(item.slug))
  return {
    lead: [...lead, ...tail.filter((item) => !item.requiresAge), ...tail.filter((item) => item.requiresAge)],
    second,
    deferred: deferredFacets(items),
  }
}

export function exploreNiches<T extends { slug: string; requiresAge?: boolean }>(items: T[]): { lead: T[]; mild: T[]; deferred: T[] } {
  const pool = inView(items, null)
  const mildSlugs = new Set(EXPLORE_MILD_NICHES)
  const mild = EXPLORE_MILD_NICHES.flatMap((slug) => pool.filter((item) => item.slug === slug))
  const rest = pool.filter((item) => !mildSlugs.has(item.slug))
  const lead = NICHE_LEAD.flatMap((slug) => rest.filter((item) => item.slug === slug))
  const used = new Set(lead.map((item) => item.slug))
  const tail = rest.filter((item) => !used.has(item.slug))
  return {
    lead: [...lead, ...tail.filter((item) => item.requiresAge), ...tail.filter((item) => !item.requiresAge)],
    mild,
    deferred: deferredFacets(items),
  }
}

export function optionsForSubmit<T extends { id: string; slug: string }>(items: T[], selectedId: string, more: boolean): T[] {
  const visible = items.filter((item) => !isDeferredFacet(item.slug))
  const extra = deferredFacets(items)
  if (more) return [...visible, ...extra]
  return [...visible, ...extra.filter((item) => item.id === selectedId)]
}
