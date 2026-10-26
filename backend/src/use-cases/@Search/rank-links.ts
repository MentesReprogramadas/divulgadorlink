import { PUBLIC_LINK_FILTER } from '@/domain/catalog/public-link'

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

export function nameMatchSql(queryParameter: '$1' | '$2' = '$1'): string {
  return `BTRIM(${queryParameter}) <> '' AND strpos(lower(l."name"), lower(BTRIM(${queryParameter}))) > 0`
}

export function searchRelevanceScore(name: string, query: string, score: number, textWeight: number): number {
  const needle = query.trim().toLowerCase()
  // A literal name match carries the same textual evidence as an autocomplete suggestion.
  return needle && name.toLowerCase().includes(needle) ? Math.max(textWeight, score) : score
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
  const lower = value.normalize('NFC').toLowerCase()
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

const topicAliases: Record<string, readonly string[]> = {
  adulto: ['adultos', 'conteudo adulto', 'putaria', 'corno', 'cornos', 'porno', 'pornografia', 'pornografico', 'sexo', 'sexual', 'erotico', 'erotica', 'nudes', 'nsfw', 'hentai'],
  'educacao-cursos': ['curso', 'cursos', 'aula', 'aulas', 'estudar', 'estudos', 'educacao', 'aprendizado', 'concurso', 'concursos', 'matematica'],
  'tecnologia-internet': ['tecnologia', 'programacao', 'programar', 'software', 'desenvolvimento de software', 'inteligencia artificial', 'computador', 'computadores', 'python', 'javascript'],
  jogos: ['jogo', 'game', 'games', 'gamer', 'gamers', 'gaming', 'videogame', 'videogames'],
  'compras-ofertas-cupons': ['oferta', 'ofertas', 'cupom', 'cupons', 'desconto', 'descontos', 'promocao', 'promocoes', 'compras'],
  'ganhar-dinheiro': ['renda extra', 'ganhar dinheiro', 'trabalho extra'],
  apostas: ['aposta', 'apostar', 'bets', 'cassino'],
  'divulgacao-marketing': ['divulgacao', 'marketing', 'publicidade', 'trafego pago'],
  'filmes-series': ['filme', 'filmes', 'serie', 'series', 'cinema'],
  streaming: ['streaming', 'iptv'],
  'servicos-ferramentas': ['ferramenta', 'ferramentas', 'automacao'],
  'saude-bem-estar': ['saude', 'bem estar', 'fitness', 'academia', 'nutricao'],
  'moda-beleza': ['moda', 'beleza', 'maquiagem', 'roupas'],
  'afiliados-monetizacao': ['afiliado', 'afiliados', 'monetizacao'],
  'marketplace-vendas-diretas': ['marketplace', 'vendas', 'revenda'],
  futebol: ['futebol', 'futebolistico'],
  musicas: ['musica', 'musicas', 'musical', 'cancoes', 'banda', 'bandas'],
  'entretenimento-geral': ['entretenimento', 'humor', 'memes'],
  esportes: ['esporte', 'esportes', 'basquete', 'volei', 'corrida'],
  'financas-investimentos': ['financas', 'investimento', 'investimentos', 'bolsa de valores', 'criptomoedas'],
  'politica-sociedade': ['politica', 'sociedade', 'eleicoes'],
  'apps-redes-plataformas': ['aplicativo', 'aplicativos', 'apps', 'redes sociais'],
  'animes-nerd-geek': ['anime', 'animes', 'manga', 'nerd', 'geek'],
  'amizade-relacionamentos': ['amizade', 'amizades', 'relacionamento', 'relacionamentos', 'namoro'],
  'servicos-profissionais': ['servicos profissionais', 'freelancer', 'freelance'],
  culinaria: ['culinaria', 'receitas', 'cozinha', 'confeitaria'],
}

export function searchTopicSlugs(query: string): string[] {
  const phrase = ' ' + foldFacet(query).replace(/(?:\+18\b|\b18\+)/g, ' conteudo adulto ').replace(/[^a-z0-9]+/g, ' ').trim() + ' '
  return Object.entries(topicAliases).filter(([, aliases]) => aliases.some(alias => phrase.includes(' ' + alias + ' '))).map(([slug]) => slug)
}

export function searchFacetProbe(query: string): SearchFacetProbe {
  const exact = foldFacet(query)
  if (!exact) return { exact: '', tokens: [], prefix: null }
  const tokens = [...new Set([...exact.split(' ').filter((token) => token.length >= 3 && token !== exact), ...searchTopicSlugs(query)])]
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

export type SearchFacetScope = { niches: string[]; networks: string[] }

export function matchesSearchFacetScope(row: {nicheSlug?:string|null;networkSlug?:string|null},scope?:SearchFacetScope):boolean {
  return !scope || ((!scope.niches.length || scope.niches.includes(row.nicheSlug??'')) && (!scope.networks.length || scope.networks.includes(row.networkSlug??'')))
}

export function searchFacetSql(first: number): {match:string;clause:string} {
  const niches=`$${first}::text[]`, networks=`$${first+1}::text[]`
  const matches=`(cardinality(${niches})=0 OR n.slug=ANY(${niches})) AND (cardinality(${networks})=0 OR net.slug=ANY(${networks}))`
  return {match:`(cardinality(${niches})+cardinality(${networks})>0 AND ${matches})`,clause:`AND ${matches}`}
}

export function hybridSearchSql(discoveryClause='', facetMatch='false', facetClause=''): string {
  return `
    WITH query_embedding AS (SELECT $2::vector AS v)
    SELECT l."id", l."name", l."description", l."cityId", l."languageTag", l."modality",
      GREATEST(ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1)), CASE WHEN ${facetMatch} THEN 1 ELSE 0 END) AS text_score,
      CASE WHEN l."embedding" IS NULL THEN NULL ELSE 1 - (l."embedding" <=> (SELECT v FROM query_embedding)) END AS semantic_score,
      l."embeddingState",
      (
        SELECT p."activatedAt" FROM "promotions" p
        WHERE p."linkId" = l."id" AND p."status" = 'ACTIVE' AND (NOT p.administrative OR p."expiresAt" IS NULL OR p."expiresAt" > NOW()) AND p."surface" = 'SEARCH'
        ORDER BY p."activatedAt" ASC
        LIMIT 1
      ) AS search_activated_at,
      (n."requiresAge" OR net."requiresAge") AS requires_age,
      n."name" AS niche_name,
      n."slug" AS niche_slug,
      net."name" AS network_name,
      net."slug" AS network_slug,
      n."isPublicFacet" AS niche_public, net."isPublicFacet" AS network_public,
      n."requiresAge" AS niche_age, net."requiresAge" AS network_age
    FROM "links" l
    JOIN "niches" n ON n."id" = l."nicheId"
    JOIN "networks" net ON net."id" = l."networkId"
    WHERE l."tenantId" = $3
      AND ${PUBLIC_LINK_FILTER}
      ${discoveryClause}
      ${facetClause}
      AND ($4::text <> 'no' OR NOT (n."requiresAge" OR net."requiresAge"))
      AND GREATEST(
        CASE WHEN (${nameMatchSql()}) OR (${facetMatch}) THEN $5 ELSE 0 END,
        $5 * GREATEST(ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1)), CASE WHEN ${facetMatch} THEN 1 ELSE 0 END)
        + $6 * COALESCE(1 - (l."embedding" <=> (SELECT v FROM query_embedding)), 0)
      ) >= $7
  `
}
