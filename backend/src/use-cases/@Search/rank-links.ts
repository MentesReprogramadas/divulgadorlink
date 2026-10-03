interface SearchRow {
  id: string
  relevance: number
  searchActivatedAt: Date | null
  requiresAge: boolean
}

export function visibleForAge<T extends { requiresAge: boolean }>(rows: T[], age: 'yes' | 'no' | 'unknown'): T[] {
  if (age === 'yes') return rows
  return rows.filter((row) => !row.requiresAge)
}

export function relevanceScore(textScore: number, semanticScore: number, textWeight: number, semanticWeight: number): number {
  return textWeight * textScore + semanticWeight * semanticScore
}

export function rankSearch<T extends SearchRow>(rows: T[], threshold: number) {
  const eligible = rows.filter((row) => row.relevance >= threshold)
  const sponsored = eligible
    .filter((row) => row.searchActivatedAt)
    .sort((a, b) => a.searchActivatedAt!.getTime() - b.searchActivatedAt!.getTime())
  const sponsoredIds = new Set(sponsored.map((row) => row.id))
  const organic = eligible
    .filter((row) => !sponsoredIds.has(row.id))
    .sort((a, b) => b.relevance - a.relevance)
  return { sponsored, organic }
}

export function rankHome(rows: { id: string; relevance: number; homeActivatedAt: Date | null }[]) {
  const sponsored = rows
    .filter((row) => row.homeActivatedAt)
    .sort((a, b) => a.homeActivatedAt!.getTime() - b.homeActivatedAt!.getTime())
  const organic = rows.filter((row) => !row.homeActivatedAt).sort((a, b) => b.relevance - a.relevance)
  return { sponsored, organic }
}

export function rankNiche(rows: { id: string; relevance: number; nicheActivatedAt: Date | null }[]) {
  return rankHome(rows.map((row) => ({ id: row.id, relevance: row.relevance, homeActivatedAt: row.nicheActivatedAt })))
}

export const FACET_ACCENTS = 'áàâãäéèêëíìîïóòôõöúùûüç'
export const FACET_PLAIN = 'aaaaaeeeeiiiiooooouuuuc'

export type SearchFacetProbe = { exact: string; tokens: string[]; prefix: string | null }

export type ResolvedSearchTarget = {
  kind: 'niche' | 'network' | 'results'
  slug: string | null
  name: string | null
  exclusive: boolean
}

const openSearch: ResolvedSearchTarget = { kind: 'results', slug: null, name: null, exclusive: false }

export function foldFacet(value: string): string {
  const lower = value.toLowerCase()
  let folded = ''
  for (const char of lower) {
    const index = FACET_ACCENTS.indexOf(char)
    folded += index >= 0 ? FACET_PLAIN[index] : char
  }
  return folded.replace(/\s+/g, ' ').trim()
}

export function escapeLikePrefix(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export function searchFacetProbe(query: string): SearchFacetProbe {
  const exact = foldFacet(query)
  if (!exact) return { exact: '', tokens: [], prefix: null }
  const tokens = [...new Set(exact.split(' ').filter((token) => token.length >= 3 && token !== exact))]
  const prefix = exact.includes(' ') || exact.length < 4 ? null : exact
  return { exact, tokens, prefix }
}

function facetKeys(item: { slug: string; name: string }): [string, string] {
  return [foldFacet(item.slug), foldFacet(item.name)]
}

function exclusiveOf(
  kind: 'niche' | 'network',
  item: { slug: string; name: string },
): ResolvedSearchTarget {
  return { kind, slug: item.slug, name: item.name, exclusive: true }
}

function hintOf(
  kind: 'niche' | 'network',
  item: { slug: string; name: string },
): ResolvedSearchTarget {
  return { kind, slug: item.slug, name: item.name, exclusive: false }
}

export function facetMatchesProbe(item: { slug: string; name: string }, probe: SearchFacetProbe): boolean {
  if (!probe.exact) return false
  const keys = facetKeys(item)
  if (keys.includes(probe.exact) || probe.tokens.some((token) => keys.includes(token))) return true
  return probe.prefix !== null && keys.some((key) => key.startsWith(probe.prefix!))
}

export function resolveSearchTarget(
  query: string,
  niches: { slug: string; name: string }[],
  networks: { slug: string; name: string }[],
): ResolvedSearchTarget {
  const probe = searchFacetProbe(query)
  if (!probe.exact) return openSearch

  const nicheExact = niches.filter((item) => facetKeys(item).includes(probe.exact))
  const networkExact = networks.filter((item) => facetKeys(item).includes(probe.exact))
  if (nicheExact.length + networkExact.length > 1) return openSearch
  if (nicheExact[0]) return exclusiveOf('niche', nicheExact[0])
  if (networkExact[0]) return exclusiveOf('network', networkExact[0])

  const hinted = [
    ...niches.filter((item) => probe.tokens.some((token) => facetKeys(item).includes(token))).map((item) => hintOf('niche', item)),
    ...networks.filter((item) => probe.tokens.some((token) => facetKeys(item).includes(token))).map((item) => hintOf('network', item)),
  ]
  if (hinted.length > 1) return openSearch
  if (hinted[0]) return hinted[0]

  if (!probe.prefix) return openSearch
  const prefixed = [
    ...niches.filter((item) => facetKeys(item).some((key) => key.startsWith(probe.prefix!))).map((item) => hintOf('niche', item)),
    ...networks.filter((item) => facetKeys(item).some((key) => key.startsWith(probe.prefix!))).map((item) => hintOf('network', item)),
  ]
  if (prefixed.length !== 1) return openSearch
  return prefixed[0]
}

export function autocompleteIds(rows: SearchRow[], threshold: number, limit = 8): string[] {
  const ranked = rankSearch(rows, threshold)
  return [...ranked.sponsored, ...ranked.organic].slice(0, limit).map((row) => row.id)
}

export function hybridSearchSql(): string {
  return `
    WITH query_embedding AS (SELECT $2::vector AS v)
    SELECT l."id", l."name", l."description",
      ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1)) AS text_score,
      CASE WHEN l."embedding" IS NULL THEN NULL ELSE 1 - (l."embedding" <=> (SELECT v FROM query_embedding)) END AS semantic_score,
      l."embeddingState",
      (
        SELECT p."activatedAt" FROM "promotions" p
        WHERE p."linkId" = l."id" AND p."status" = 'ACTIVE' AND p."surface" = 'SEARCH'
        ORDER BY p."activatedAt" ASC
        LIMIT 1
      ) AS search_activated_at,
      n."requiresAge" AS requires_age,
      n."name" AS niche_name,
      n."slug" AS niche_slug,
      net."name" AS network_name,
      net."slug" AS network_slug
    FROM "links" l
    JOIN "niches" n ON n."id" = l."nicheId"
    JOIN "networks" net ON net."id" = l."networkId"
    WHERE l."tenantId" = $3
      AND l."status" = 'PUBLISHED'
      AND ($4::text = 'yes' OR $4::text = 'no' OR $4::text = 'unknown')
      AND (
        $5 * ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1))
        + $6 * COALESCE(1 - (l."embedding" <=> (SELECT v FROM query_embedding)), 0)
      ) >= $7
  `
}
