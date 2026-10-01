import { PrismaClient } from '@prisma/client'
import { hybridSearchSql, rankSearch, relevanceScore } from '@/use-cases/@Search/rank-links'

const url = process.env.BENCH_DATABASE_URL
if (!url || !url.includes('/bench')) throw new Error('BENCH_DATABASE_URL precisa apontar para o banco descartável bench')
const size = Number(process.argv[2] ?? 10000)
const db = new PrismaClient({ datasources: { db: { url: `${url}${url.includes('?') ? '&' : '?'}connection_limit=1` } } })

const TEXT_WEIGHT = 0.4
const SEMANTIC_WEIGHT = 0.6
const THRESHOLD = 0.35
const RUNS = 5

type Row = {
  id: string
  text_score: number
  semantic_score: number | null
  search_activated_at: Date | null
}

type Query = { qid: string; tenant: string; text: string; age: 'yes' | 'no'; vec: string }

const columns = `
  l."id",
  ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1)) AS text_score,
  CASE WHEN l."embedding" IS NULL THEN NULL ELSE 1 - (l."embedding" <=> $2::vector) END AS semantic_score,
  (
    SELECT p."activatedAt" FROM "promotions" p
    WHERE p."linkId" = l."id" AND p."status" = 'ACTIVE' AND p."surface" = 'SEARCH'
    ORDER BY p."activatedAt" ASC
    LIMIT 1
  ) AS search_activated_at`

const eligible = `
  ($5 * ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1))
   + $6 * COALESCE(1 - (l."embedding" <=> $2::vector), 0)) >= $7`

const visible = `l."tenantId" = $3 AND l."status" = 'PUBLISHED' AND ($4::text = 'yes' OR n."requiresAge" = false)`

const annSql = `
  WITH ann AS MATERIALIZED (
    SELECT l."id" FROM "links" l JOIN "niches" n ON n."id" = l."nicheId"
    WHERE ${visible} AND l."embedding" IS NOT NULL
    ORDER BY l."embedding" <=> $2::vector
    LIMIT $8
  )
  SELECT ${columns}, (SELECT count(*) FROM ann)::int AS candidates
  FROM "links" l JOIN ann ON ann."id" = l."id"
  WHERE ${eligible}`

const textOnlySql = `
  SELECT ${columns}
  FROM "links" l JOIN "niches" n ON n."id" = l."nicheId"
  WHERE ${visible}
    AND to_tsvector('simple', l."name" || ' ' || l."description") @@ replace(plainto_tsquery('simple', $1)::text, '&', '|')::tsquery
    AND ${eligible}`

const twoPhaseSql = `
  WITH ann AS MATERIALIZED (
    SELECT l."id", l."embedding" <=> $2::vector AS distance FROM "links" l JOIN "niches" n ON n."id" = l."nicheId"
    WHERE ${visible} AND l."embedding" IS NOT NULL
    ORDER BY l."embedding" <=> $2::vector
    LIMIT $8
  ),
  bound AS (
    SELECT LEAST(
      ($7 - $6 * CASE WHEN count(*) < $8 THEN -1 ELSE 1 - max(distance) END) / $5,
      $7 / $5
    ) AS text_floor FROM ann
  ),
  textual AS (
    SELECT l."id" FROM "links" l JOIN "niches" n ON n."id" = l."nicheId"
    WHERE ${visible}
      AND to_tsvector('simple', l."name" || ' ' || l."description") @@ replace(plainto_tsquery('simple', $1)::text, '&', '|')::tsquery
      AND ts_rank(to_tsvector('simple', l."name" || ' ' || l."description"), plainto_tsquery('simple', $1)) >= (SELECT text_floor FROM bound)
  ),
  paid AS (
    SELECT p."linkId" AS "id" FROM "promotions" p
    WHERE p."tenantId" = $3 AND p."status" = 'ACTIVE' AND p."surface" = 'SEARCH'
  ),
  cand AS (SELECT "id" FROM ann UNION SELECT "id" FROM textual UNION SELECT "id" FROM paid)
  SELECT ${columns}, (SELECT count(*) FROM cand)::int AS candidates
  FROM "links" l JOIN cand ON cand."id" = l."id" JOIN "niches" n ON n."id" = l."nicheId"
  WHERE ${visible} AND ${eligible}`

async function seed() {
  const t0 = performance.now()
  const steps = [
    `DROP TABLE IF EXISTS bench_global, bench_base, bench_topics, bench_meta, bench_queries`,
    `DROP INDEX IF EXISTS bench_links_fts_gin`,
    `DROP INDEX IF EXISTS links_embedding_hnsw_idx`,
    `TRUNCATE tenants CASCADE`,
    `CREATE TABLE bench_global AS SELECT (SELECT array_agg((random() - 0.5)::float4 ORDER BY i) FROM generate_series(1, 1536) i) v`,
    `CREATE TABLE bench_base AS SELECT b, (SELECT array_agg((random() - 0.5)::float4 ORDER BY i) FROM generate_series(1, 1536) i WHERE b >= 0) v FROM generate_series(0, 99) b`,
    `CREATE TABLE bench_topics AS SELECT t, (SELECT array_agg((0.6 * g.v[i] + 0.7 * bb.v[i] + 0.7 * (random() - 0.5))::float4 ORDER BY i) FROM generate_series(1, 1536) i WHERE t >= 0) c
       FROM generate_series(0, 199) t JOIN bench_base bb ON bb.b = t / 2 CROSS JOIN bench_global g`,
    `INSERT INTO tenants (id, host, name, "updatedAt") VALUES ('t1', 't1.bench', 't1', now()), ('t2', 't2.bench', 't2', now()), ('t3', 't3.bench', 't3', now())`,
    `INSERT INTO niches (id, "tenantId", name, slug, "requiresAge", "updatedAt")
       SELECT t || '_n' || k, t, 'N' || k, 'n' || k, k % 5 = 0, now() FROM unnest(ARRAY['t1','t2','t3']) t, generate_series(1, 10) k`,
    `INSERT INTO networks (id, "tenantId", name, slug, "knownHosts", "updatedAt")
       SELECT t || '_w', t, 'W', 'w', '{}', now() FROM unnest(ARRAY['t1','t2','t3']) t`,
    `CREATE TABLE bench_meta AS SELECT g,
       'l' || lpad(g::text, 8, '0') AS id,
       CASE WHEN g % 100 = 0 THEN 't3' WHEN g % 10 = 0 THEN 't2' ELSE 't1' END AS tenant,
       floor(200 * power(random(), 2))::int AS topic,
       (0.5 + 1.5 * random())::float4 AS noise,
       g % 300 = 7 AS stuffed,
       g % 50 = 3 AS pending
     FROM generate_series(1, ${size}) g`,
    `INSERT INTO links (id, "tenantId", "canonicalUrl", name, description, "networkId", "nicheId", status, "embeddingState", "updatedAt")
       SELECT m.id, m.tenant, 'https://x/' || m.g, 'Link ' || m.g || ' tema' || m.topic,
         CASE WHEN m.stuffed THEN repeat('tema' || ((m.topic + 50) % 200) || ' extra ', 40)
              ELSE 'conteudo sobre tema' || m.topic || ' item ' || (m.g % 50) END,
         m.tenant || '_w', m.tenant || '_n' || (1 + m.g % 10),
         (CASE WHEN m.g % 10 = 1 THEN 'DRAFT' ELSE 'PUBLISHED' END)::"LinkStatus",
         (CASE WHEN m.pending THEN 'PENDING' ELSE 'READY' END)::"EmbeddingState", now()
       FROM bench_meta m`,
    `UPDATE links l SET embedding = (
       SELECT array_agg(t.c[i] + m.noise * (random() - 0.5)::float4 ORDER BY i) FROM generate_series(1, 1536) i
     )::vector
     FROM bench_meta m JOIN bench_topics t ON t.t = m.topic
     WHERE m.id = l.id AND NOT m.pending`,
    `INSERT INTO promotions (id, "tenantId", "linkId", status, surface, "activatedAt", "expiresAt", "updatedAt")
       SELECT 'ps' || m.g, m.tenant, m.id, 'ACTIVE', 'SEARCH', now() - (m.g || ' seconds')::interval, now() + interval '7 days', now()
       FROM bench_meta m WHERE m.g % 333 = 5`,
    `INSERT INTO promotions (id, "tenantId", "linkId", status, surface, "activatedAt", "expiresAt", "updatedAt")
       SELECT 'px' || m.g, m.tenant, m.id, 'EXPIRED', 'SEARCH', now() - interval '30 days', now() - interval '23 days', now()
       FROM bench_meta m WHERE m.g % 97 = 11`,
    `CREATE TABLE bench_queries AS
       SELECT q.qid, q.tenant, q.text, q.age,
         (SELECT array_agg(t.c[i] + 0.5 * (random() - 0.5)::float4 ORDER BY i) FROM generate_series(1, 1536) i WHERE q.topic >= 0)::vector::text AS vec
       FROM (VALUES
         ('t1-tema0', 't1', 'tema0', 'no', 0), ('t1-tema0-adulto', 't1', 'tema0', 'yes', 0), ('t1-tema1', 't1', 'tema1', 'no', 1),
         ('t1-tema5', 't1', 'tema5', 'no', 5), ('t1-tema20', 't1', 'tema20', 'no', 20), ('t1-tema60', 't1', 'tema60', 'no', 60),
         ('t1-tema120', 't1', 'tema120', 'no', 120), ('t1-tema199', 't1', 'tema199', 'no', 199),
         ('t1-stuffing', 't1', 'tema50 extra', 'no', 50), ('t1-semtexto', 't1', 'palavra inexistente', 'no', 3),
         ('t3-tema0', 't3', 'tema0', 'no', 0), ('t3-tema120', 't3', 'tema120', 'no', 120)
       ) q(qid, tenant, text, age, topic)
       JOIN bench_topics t ON t.t = q.topic`,
  ]
  for (const sql of steps) await db.$executeRawUnsafe(sql)
  const seeded = performance.now()
  await db.$executeRawUnsafe(`SET maintenance_work_mem = '512MB'`)
  await db.$executeRawUnsafe(`CREATE INDEX "links_embedding_hnsw_idx" ON "links" USING hnsw ("embedding" vector_cosine_ops)`)
  const indexed = performance.now()
  await db.$executeRawUnsafe('ANALYZE')
  return { seedMs: Math.round(seeded - t0), hnswBuildMs: Math.round(indexed - seeded) }
}

function rank(rows: Row[]) {
  const t0 = performance.now()
  const ranked = rankSearch(
    rows.map((row) => ({
      id: row.id,
      relevance: relevanceScore(Number(row.text_score), row.semantic_score === null ? 0 : Number(row.semantic_score), TEXT_WEIGHT, SEMANTIC_WEIGHT),
      searchActivatedAt: row.search_activated_at,
      requiresAge: false,
    })),
    THRESHOLD,
  )
  return { ranked, rankMs: performance.now() - t0 }
}

async function setScan(mode: 'strict' | 'iterative', k: number) {
  await db.$executeRawUnsafe(`SET hnsw.ef_search = ${Math.min(Math.max(k, 40), 1000)}`)
  await db.$executeRawUnsafe(`SET hnsw.iterative_scan = ${mode === 'iterative' ? 'relaxed_order' : 'off'}`)
}

async function timed(sql: string, params: unknown[]) {
  const times: number[] = []
  let rows: Array<Row & { candidates?: number }> = []
  for (let i = 0; i < RUNS; i += 1) {
    const t0 = performance.now()
    rows = await db.$queryRawUnsafe(sql, ...params)
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  return { rows, medianMs: times[Math.floor(RUNS / 2)]! }
}

async function explain(sql: string, params: unknown[]) {
  const plan = (await db.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${sql}`, ...params)).map((row) => row['QUERY PLAN'])
  const scans = plan.filter((line) => /Seq Scan|Index (Only )?Scan|Bitmap/.test(line)).map((line) => line.trim().replace(/\s+\(actual.*$/, ''))
  const buffers = plan.find((line) => line.trim().startsWith('Buffers'))?.trim() ?? null
  const time = Number(plan.find((line) => line.startsWith('Execution Time'))?.match(/[\d.]+/)?.[0] ?? NaN)
  return { executionMs: time, scans: [...new Set(scans)], buffers }
}

function compare(base: ReturnType<typeof rank>['ranked'], other: ReturnType<typeof rank>['ranked']) {
  const baseAll = [...base.sponsored, ...base.organic].map((row) => row.id)
  const otherAll = new Set([...other.sponsored, ...other.organic].map((row) => row.id))
  const kept = baseAll.filter((id) => otherAll.has(id)).length
  const top10 = base.organic.slice(0, 10).map((row) => row.id)
  const otherTop10 = new Set(other.organic.slice(0, 10).map((row) => row.id))
  return {
    eligibleRecall: baseAll.length ? kept / baseAll.length : 1,
    lost: baseAll.length - kept,
    sponsoredIdentical: base.sponsored.map((row) => row.id).join() === other.sponsored.map((row) => row.id).join(),
    organicTop10Recall: top10.length ? top10.filter((id) => otherTop10.has(id)).length / top10.length : 1,
    firstOrganicSame: (base.organic[0]?.id ?? null) === (other.organic[0]?.id ?? null),
    orderIdentical: baseAll.join() === [...other.sponsored, ...other.organic].map((row) => row.id).join(),
  }
}

async function main() {
  await db.$executeRawUnsafe('SET plan_cache_mode = force_custom_plan')
  const setup = await seed()
  const counts = (await db.$queryRawUnsafe<Array<Record<string, number>>>(`
    SELECT (SELECT count(*) FROM links)::int AS links,
      (SELECT count(*) FROM links WHERE embedding IS NOT NULL)::int AS embedded,
      (SELECT count(*) FROM links WHERE status = 'PUBLISHED' AND "tenantId" = 't1')::int AS t1_published,
      (SELECT count(*) FROM links WHERE status = 'PUBLISHED' AND "tenantId" = 't3')::int AS t3_published,
      (SELECT count(*) FROM promotions WHERE status = 'ACTIVE' AND surface = 'SEARCH')::int AS active_search_promotions`))[0]
  console.log(JSON.stringify({ synthetic: true, size, ...setup, ...counts }))

  const queries = await db.$queryRawUnsafe<Query[]>(`SELECT qid, tenant, text, age, vec FROM bench_queries ORDER BY qid`)
  const base = new Map<string, ReturnType<typeof rank>['ranked']>()
  const report = async (strategy: string, query: Query, sql: string, params: unknown[]) => {
    const { rows, medianMs } = await timed(sql, params)
    const { ranked, rankMs } = rank(rows)
    if (strategy === 'baseline') base.set(query.qid, ranked)
    const plan = query.qid === 't1-tema0' || query.qid === 't3-tema120' ? await explain(sql, params) : undefined
    console.log(JSON.stringify({
      strategy,
      qid: query.qid,
      totalMs: Number((medianMs + rankMs).toFixed(2)),
      sqlMs: Number(medianMs.toFixed(2)),
      rankMs: Number(rankMs.toFixed(3)),
      candidates: rows[0]?.candidates ?? null,
      afterThreshold: rows.length,
      sponsored: ranked.sponsored.length,
      organic: ranked.organic.length,
      ...(strategy === 'baseline' ? {} : compare(base.get(query.qid)!, ranked)),
      ...(plan ? { plan } : {}),
    }))
  }

  for (const query of queries) {
    const params = [query.text, query.vec, query.tenant, query.age, TEXT_WEIGHT, SEMANTIC_WEIGHT, THRESHOLD]
    await setScan('strict', 40)
    await report('baseline', query, hybridSearchSql(), params)
    for (const k of [100, 1000]) {
      await setScan('strict', k)
      await report(`A-strict-K${k}`, query, annSql, [...params, k])
    }
    for (const k of [100, 500, 1000, 5000]) {
      await setScan('iterative', k)
      await report(`A-iterative-K${k}`, query, annSql, [...params, k])
    }
    await setScan('iterative', 1000)
    await report('D-noGIN-K1000', query, twoPhaseSql, [...params, 1000])
  }

  const ginStarted = performance.now()
  await db.$executeRawUnsafe(`CREATE INDEX bench_links_fts_gin ON links USING gin (to_tsvector('simple', name || ' ' || description))`)
  await db.$executeRawUnsafe('ANALYZE links')
  console.log(JSON.stringify({ ginBuildMs: Math.round(performance.now() - ginStarted), note: 'índice GIN hipotético, só no banco bench' }))
  for (const query of queries) {
    const params = [query.text, query.vec, query.tenant, query.age, TEXT_WEIGHT, SEMANTIC_WEIGHT, THRESHOLD]
    await setScan('strict', 40)
    await report('B-textOnly-GIN', query, textOnlySql, params)
    for (const k of [500, 1000]) {
      await setScan('iterative', k)
      await report(`D-GIN-K${k}`, query, twoPhaseSql, [...params, k])
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
