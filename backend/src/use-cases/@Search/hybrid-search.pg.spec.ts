import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hybridSearchSql, rankSearch, relevanceScore } from '@/use-cases/@Search/rank-links'

const url = process.env.SEARCH_DATABASE_URL
if (!url) {
  throw new Error('SEARCH_DATABASE_URL ausente')
}

const db = new PrismaClient({ datasources: { db: { url: `${url}${url.includes('?') ? '&' : '?'}connection_limit=1` } } })

const legacySql = `
    SELECT l."id", l."name", l."description",
      ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1)) AS text_score,
      CASE WHEN l."embedding" IS NULL THEN NULL ELSE 1 - (l."embedding" <=> $2::vector) END AS semantic_score,
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
        + $6 * COALESCE(1 - (l."embedding" <=> $2::vector), 0)
      ) >= $7
  `

type Row = {
  id: string
  name: string
  description: string
  text_score: number
  semantic_score: number | null
  embeddingState: string
  search_activated_at: Date | null
}

type Case = { name: string; text: string; vector: string; tenant: string; age: 'yes' | 'no'; threshold: number }

const TEXT_WEIGHT = 0.4
const SEMANTIC_WEIGHT = 0.6

function vectorSql(expression: string): string {
  return `(SELECT array_agg((${expression})::float4 ORDER BY i) FROM generate_series(1, 1536) i)::vector`
}

async function queryVector(expression: string): Promise<string> {
  const rows = await db.$queryRawUnsafe<Array<{ v: string }>>(`SELECT ${vectorSql(expression)}::text AS v`)
  return rows[0]!.v
}

async function run(sql: string, input: Case): Promise<Row[]> {
  return db.$queryRawUnsafe<Row[]>(sql, input.text, input.vector, input.tenant, input.age, TEXT_WEIGHT, SEMANTIC_WEIGHT, input.threshold)
}

function ranked(rows: Row[], threshold: number) {
  const result = rankSearch(
    rows.map((row) => ({
      id: row.id,
      relevance: relevanceScore(Number(row.text_score), row.semantic_score === null ? 0 : Number(row.semantic_score), TEXT_WEIGHT, SEMANTIC_WEIGHT),
      searchActivatedAt: row.search_activated_at,
      requiresAge: false,
    })),
    threshold,
  )
  return {
    sponsored: result.sponsored.map((row) => [row.id, row.relevance, row.searchActivatedAt?.toISOString() ?? null]),
    organic: result.organic.map((row) => [row.id, row.relevance]),
  }
}

function byId(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

describe('busca híbrida no PostgreSQL', () => {
  const cases: Case[] = []

  beforeAll(async () => {
    await db.$executeRawUnsafe('TRUNCATE TABLE promotions, links, niches, networks, tenants CASCADE')
    await db.$executeRawUnsafe(`INSERT INTO tenants (id, host, name, "updatedAt") VALUES ('s-t1', 's1.test', 'S1', now()), ('s-t2', 's2.test', 'S2', now())`)
    await db.$executeRawUnsafe(`
      INSERT INTO niches (id, "tenantId", name, slug, "requiresAge", "updatedAt") VALUES
        ('s-n1', 's-t1', 'Livre', 'livre', false, now()), ('s-n2', 's-t1', 'Adulto', 'adulto', true, now()),
        ('s-n3', 's-t2', 'Livre', 'livre', false, now())`)
    await db.$executeRawUnsafe(`
      INSERT INTO networks (id, "tenantId", name, slug, "knownHosts", "updatedAt") VALUES
        ('s-w1', 's-t1', 'W', 'w', '{}', now()), ('s-w2', 's-t2', 'W', 'w', '{}', now())`)
    await db.$executeRawUnsafe(`
      INSERT INTO links (id, "tenantId", "canonicalUrl", name, description, "networkId", "nicheId", status, "embeddingState", "updatedAt", embedding)
      SELECT 's-l' || lpad(g::text, 5, '0'),
        CASE WHEN g % 20 = 0 THEN 's-t2' ELSE 's-t1' END,
        'https://x/' || g,
        'Link ' || g || ' tema' || t.topic,
        CASE WHEN g % 97 = 0 THEN repeat('vagas emprego ', 300) ELSE 'conteudo sobre tema' || t.topic || ' item ' || (g % 13) END,
        CASE WHEN g % 20 = 0 THEN 's-w2' ELSE 's-w1' END,
        CASE WHEN g % 20 = 0 THEN 's-n3' WHEN g % 5 = 0 THEN 's-n2' ELSE 's-n1' END,
        (CASE WHEN g % 11 = 0 THEN 'DRAFT' ELSE 'PUBLISHED' END)::"LinkStatus",
        (CASE WHEN g % 97 = 0 OR g % 31 = 0 THEN 'PENDING' ELSE 'READY' END)::"EmbeddingState",
        now(),
        CASE WHEN g % 97 = 0 OR g % 31 = 0 THEN NULL
          ELSE ${vectorSql('sin(i * (t.topic + 3) * 0.7) + (0.4 + (g % 7) * 0.15) * sin(i * g * 1.37)')} END
      FROM generate_series(1, 2000) g
      CROSS JOIN LATERAL (SELECT CASE WHEN g % 10 < 6 THEN 0 WHEN g % 10 < 9 THEN 1 ELSE 2 + g % 7 END AS topic) t`)
    await db.$executeRawUnsafe(`
      INSERT INTO promotions (id, "tenantId", "linkId", status, surface, "activatedAt", "expiresAt", "updatedAt")
      SELECT 's-p' || l.id, l."tenantId", l.id, 'ACTIVE', 'SEARCH', now() - (row_number() OVER (ORDER BY l.id) || ' minutes')::interval,
        now() + interval '7 days', now()
      FROM links l WHERE l.id LIKE 's-l%' AND l.status = 'PUBLISHED' AND substr(l.id, 4)::int % 53 = 2`)
    await db.$executeRawUnsafe(`
      INSERT INTO promotions (id, "tenantId", "linkId", status, surface, "activatedAt", "expiresAt", "updatedAt")
      SELECT 's-x' || l.id, l."tenantId", l.id, 'EXPIRED', 'SEARCH', now() - interval '30 days', now() - interval '23 days', now()
      FROM links l WHERE l.id LIKE 's-l%' AND substr(l.id, 4)::int % 41 = 3`)
    await db.$executeRawUnsafe('ANALYZE links, niches, promotions')

    const topic0 = await queryVector('sin(i * 3 * 0.7)')
    const topic1 = await queryVector('sin(i * 4 * 0.7)')
    const topic5 = await queryVector('sin(i * 8 * 0.7)')
    const opposite = await queryVector('-sin(i * 3 * 0.7)')
    cases.push(
      { name: 'muitos resultados com patrocinados', text: 'tema0', vector: topic0, tenant: 's-t1', age: 'no', threshold: 0.35 },
      { name: 'adulto liberado', text: 'tema0', vector: topic0, tenant: 's-t1', age: 'yes', threshold: 0.35 },
      { name: 'limiar mais alto', text: 'tema0', vector: topic0, tenant: 's-t1', age: 'yes', threshold: 0.6 },
      { name: 'poucos resultados', text: 'tema5', vector: topic5, tenant: 's-t1', age: 'no', threshold: 0.35 },
      { name: 'sem palavras em comum', text: 'palavra inexistente', vector: topic1, tenant: 's-t1', age: 'no', threshold: 0.35 },
      { name: 'somente textual', text: 'vagas emprego remoto', vector: opposite, tenant: 's-t1', age: 'yes', threshold: 0.35 },
      { name: 'sem resultado', text: 'palavra inexistente', vector: opposite, tenant: 's-t1', age: 'yes', threshold: 0.35 },
      { name: 'outro tenant', text: 'tema0', vector: topic0, tenant: 's-t2', age: 'no', threshold: 0.35 },
    )
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('devolve as mesmas linhas, scores e ranking da query anterior em todos os casos', async () => {
    const counts: Record<string, number> = {}
    for (const input of cases) {
      const before = await run(legacySql, input)
      const after = await run(hybridSearchSql(), input)
      expect(byId(after), input.name).toEqual(byId(before))
      expect(ranked(after, input.threshold), input.name).toEqual(ranked(before, input.threshold))
      counts[input.name] = after.length
    }
    const byName = (name: string) => cases.find((input) => input.name === name)!
    const sponsored = ranked(await run(hybridSearchSql(), byName('muitos resultados com patrocinados')), 0.35).sponsored
    const textOnly = await run(hybridSearchSql(), byName('somente textual'))
    const otherTenant = await run(hybridSearchSql(), byName('outro tenant'))

    expect(counts['muitos resultados com patrocinados']).toBeGreaterThan(100)
    expect(sponsored.length).toBeGreaterThan(0)
    expect(counts['adulto liberado']).toBeGreaterThan(counts['muitos resultados com patrocinados']!)
    expect(counts['limiar mais alto']).toBeLessThan(counts['adulto liberado']!)
    expect(counts['poucos resultados']).toBeGreaterThan(0)
    expect(counts['poucos resultados']).toBeLessThan(50)
    expect(counts['sem palavras em comum']).toBeGreaterThan(0)
    expect(textOnly.length).toBeGreaterThan(0)
    expect(textOnly.every((row) => row.semantic_score === null)).toBe(true)
    expect(counts['sem resultado']).toBe(0)
    expect(otherTenant.length).toBeGreaterThan(0)
    expect(otherTenant.every((row) => Number(row.id.slice(3)) % 20 === 0)).toBe(true)
  })

  it('não reconstrói o vetor por linha quando o PostgreSQL usa o plano genérico', async () => {
    const input = cases[0]!
    const expected = (await run(hybridSearchSql(), input)).length
    const connection = new PrismaClient({ datasources: { db: { url: `${url}${url!.includes('?') ? '&' : '?'}connection_limit=1` } } })
    const params = [input.text, input.vector, input.tenant, input.age, TEXT_WEIGHT, SEMANTIC_WEIGHT, input.threshold]
    const durations: number[] = []
    for (let execution = 1; execution <= 10; execution += 1) {
      const started = performance.now()
      const rows = await connection.$queryRawUnsafe<Row[]>(hybridSearchSql(), ...params)
      durations.push(Number((performance.now() - started).toFixed(1)))
      expect(rows.length, `execução ${execution}`).toBe(expected)
    }
    const [statement] = await connection.$queryRawUnsafe<Array<{ generic_plans: bigint; custom_plans: bigint }>>(
      `SELECT generic_plans, custom_plans FROM pg_prepared_statements WHERE statement LIKE '%ts_rank%' ORDER BY prepare_time DESC LIMIT 1`,
    )
    console.log(JSON.stringify({ durationsMs: durations, rows: expected, genericPlans: Number(statement?.generic_plans), customPlans: Number(statement?.custom_plans) }))
    expect(Number(statement?.generic_plans)).toBeGreaterThan(0)
    expect(median(durations.slice(5))).toBeLessThan(median(durations.slice(0, 5)) * 3 + 20)

    const literal = (value: string) => `'${value.replace(/'/g, "''")}'`
    await connection.$executeRawUnsafe('SET plan_cache_mode = force_generic_plan')
    await connection.$executeRawUnsafe(`PREPARE hybrid_generic(text, text, text, text, float8, float8, float8) AS ${hybridSearchSql()}`)
    const plan = (await connection.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
      `EXPLAIN (ANALYZE, VERBOSE, BUFFERS, COSTS OFF) EXECUTE hybrid_generic(${literal(input.text)}, ${literal(input.vector)}, ${literal(input.tenant)}, ${literal(input.age)}, ${TEXT_WEIGHT}, ${SEMANTIC_WEIGHT}, ${input.threshold})`,
    )).map((row) => row['QUERY PLAN'])
    await connection.$disconnect()

    const casts = plan.filter((line) => line.includes('::vector'))
    const castIndex = plan.findIndex((line) => line.includes('::vector'))
    const scanFilter = plan.filter((line) => /^\s*Filter:/.test(line) && line.includes('embedding'))
    expect(casts, plan.join('\n')).toHaveLength(1)
    expect(plan[castIndex - 1], plan.join('\n')).toMatch(/loops=1\)/)
    expect(scanFilter.length, plan.join('\n')).toBeGreaterThan(0)
    expect(scanFilter.some((line) => line.includes('::vector')), plan.join('\n')).toBe(false)
    expect(plan.find((line) => /actual time=.*rows=\d+/.test(line))?.match(/rows=(\d+)/)?.[1]).toBe(String(expected))
  })
})
