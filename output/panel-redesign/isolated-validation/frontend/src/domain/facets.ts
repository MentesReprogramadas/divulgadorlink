export const NETWORK_LEAD = ['telegram', 'discord', 'x'] as const
export const NICHE_LEAD = ['jogos', 'musicas', 'filmes-series', 'educacao-cursos'] as const

const SCATTERED_FACETS = ['adulto', 'apostas', 'ganhar-dinheiro', 'onlyfans', 'fansly', 'fatal-model', 'privacy'] as const
const EXPLORE_NETWORK_SECOND = ['instagram', 'whatsapp', 'youtube', 'tiktok', 'facebook']
const EXPLORE_MILD_NICHES = ['jogos', 'musicas', 'filmes-series', 'educacao-cursos', 'futebol', 'esportes']

function isScattered(slug: string): boolean {
  return (SCATTERED_FACETS as readonly string[]).includes(slug)
}

export function spreadFacets<T extends { slug: string }>(items: T[]): T[] {
  const ordinary = items.filter((item) => !isScattered(item.slug))
  const scattered = items.filter((item) => isScattered(item.slug))
  if (ordinary.length === 0 || scattered.length === 0) return [...ordinary, ...scattered]
  const out: T[] = []
  const stride = (ordinary.length + 1) / (scattered.length + 1)
  let cursor = stride
  let index = 0
  for (let i = 0; i < ordinary.length; i++) {
    out.push(ordinary[i]!)
    while (index < scattered.length && i + 1 >= Math.round(cursor)) {
      out.push(scattered[index]!)
      index += 1
      cursor += stride
    }
  }
  while (index < scattered.length) out.push(scattered[index++]!)
  return out
}

export function leadFirst<T extends { slug: string; requiresAge?: boolean }>(
  items: T[],
  pins: readonly string[],
  active: string | null,
): T[] {
  const lead = pins.flatMap((slug) => items.filter((item) => item.slug === slug))
  const used = new Set(lead.map((item) => item.slug))
  const rest = items.filter((item) => !used.has(item.slug))
  const ordered = [...lead, ...spreadFacets(rest)]
  if (!active || used.has(active)) return ordered
  const index = ordered.findIndex((item) => item.slug === active)
  if (index < 0 || index <= lead.length) return ordered
  const [current] = ordered.splice(index, 1)
  ordered.splice(lead.length, 0, current!)
  return ordered
}

export function exploreNetworks<T extends { slug: string; requiresAge?: boolean }>(items: T[]): { lead: T[]; second: T[] } {
  const secondSlugs = new Set(EXPLORE_NETWORK_SECOND)
  const second = EXPLORE_NETWORK_SECOND.flatMap((slug) => items.filter((item) => item.slug === slug))
  const rest = items.filter((item) => !secondSlugs.has(item.slug))
  const lead = NETWORK_LEAD.flatMap((slug) => rest.filter((item) => item.slug === slug))
  const used = new Set(lead.map((item) => item.slug))
  const tail = rest.filter((item) => !used.has(item.slug))
  return { lead: [...lead, ...spreadFacets(tail)], second }
}

export function exploreNiches<T extends { slug: string; requiresAge?: boolean }>(items: T[]): { lead: T[]; mild: T[] } {
  const mildSlugs = new Set(EXPLORE_MILD_NICHES)
  const mild = EXPLORE_MILD_NICHES.flatMap((slug) => items.filter((item) => item.slug === slug))
  const rest = items.filter((item) => !mildSlugs.has(item.slug))
  const lead = NICHE_LEAD.flatMap((slug) => rest.filter((item) => item.slug === slug))
  const used = new Set(lead.map((item) => item.slug))
  const tail = rest.filter((item) => !used.has(item.slug))
  return { lead: [...lead, ...spreadFacets(tail)], mild }
}
