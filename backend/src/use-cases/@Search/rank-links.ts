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

export function resolveSearchTarget(
  query: string,
  niches: { slug: string; name: string }[],
  networks: { slug: string; name: string }[],
): { kind: 'niche' | 'network' | 'results'; slug: string | null } {
  const needle = query.trim().toLowerCase()
  const niche = niches.find((item) => item.slug === needle || item.name.toLowerCase() === needle)
  if (niche) return { kind: 'niche', slug: niche.slug }
  const network = networks.find((item) => item.slug === needle || item.name.toLowerCase() === needle)
  if (network) return { kind: 'network', slug: network.slug }
  return { kind: 'results', slug: null }
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
      ) AS search_activated_at
    FROM "links" l
    JOIN "niches" n ON n."id" = l."nicheId"
    WHERE l."tenantId" = $3
      AND l."status" = 'PUBLISHED'
      AND ($4::text = 'yes' OR n."requiresAge" = false)
      AND (
        $5 * ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1))
        + $6 * COALESCE(1 - (l."embedding" <=> (SELECT v FROM query_embedding)), 0)
      ) >= $7
  `
}
