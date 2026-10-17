import { PrismaClient } from '@prisma/client'
import { hybridSearchSql } from '@/use-cases/@Search/rank-links'

const url = process.env.BENCH_DATABASE_URL
if (!url || !url.includes('/bench')) throw new Error('BENCH_DATABASE_URL precisa apontar para o banco descartável bench')
const singleConnectionUrl = `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`

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
  text_score: number
  semantic_score: number | null
  embeddingState: string
  search_activated_at: Date | null
}

async function series(label: string, sql: string, params: unknown[]) {
  const db = new PrismaClient({ datasources: { db: { url: singleConnectionUrl } } })
  try {
    const [{ pid }] = await db.$queryRawUnsafe<Array<{ pid: number }>>('SELECT pg_backend_pid() AS pid')
    const times: number[] = []
    const counts: number[] = []
    let rows: Row[] = []
    for (let i = 0; i < 10; i += 1) {
      const t0 = performance.now()
      rows = await db.$queryRawUnsafe<Row[]>(sql, ...params)
      times.push(Math.round(performance.now() - t0))
      counts.push(rows.length)
    }
    const [{ samePid }] = await db.$queryRawUnsafe<Array<{ samePid: boolean }>>(
      `SELECT pg_backend_pid() = ${pid} AS "samePid"`,
    )
    const [plans] = await db.$queryRawUnsafe<Array<{ generic_plans: bigint; custom_plans: bigint }>>(
      `SELECT generic_plans, custom_plans FROM pg_prepared_statements WHERE statement LIKE '%ts_rank%' ORDER BY prepare_time DESC LIMIT 1`,
    )
    const avg = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length)
    console.log(JSON.stringify({
      label, samePid, msPerExecution: times, avg, best: Math.min(...times), worst: Math.max(...times),
      counts, genericPlans: Number(plans?.generic_plans ?? 0), customPlans: Number(plans?.custom_plans ?? 0),
    }))
    return rows
  } finally {
    await db.$disconnect()
  }
}

function canonical(rows: Row[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id)).map((row) => ({
    ...row,
    text_score: Number(row.text_score),
    semantic_score: row.semantic_score === null ? null : Number(row.semantic_score),
    search_activated_at: row.search_activated_at?.toISOString() ?? null,
  }))
}

async function main() {
  const reader = new PrismaClient({ datasources: { db: { url: singleConnectionUrl } } })
  const [query] = await reader.$queryRawUnsafe<Array<{ text: string; vec: string; tenant: string }>>(
    `SELECT text, vec, tenant FROM bench_queries WHERE qid = 't1-tema0'`,
  )
  console.log(JSON.stringify(await reader.$queryRawUnsafe(`SELECT count(*)::int AS links FROM links`)))
  await reader.$disconnect()
  const params = [query!.text, query!.vec, query!.tenant, 'no', 0.4, 0.6, 0.35]
  const before = await series('antes (SQL legado, plan_cache_mode=auto)', legacySql, params)
  const after = await series('depois (hybridSearchSql, plan_cache_mode=auto)', hybridSearchSql(), params)
  const a = canonical(before)
  const b = canonical(after)
  const identical = JSON.stringify(a) === JSON.stringify(b)
  const mismatches = a.filter((row, i) => JSON.stringify(row) !== JSON.stringify(b[i])).length
  console.log(JSON.stringify({ identicalRowsAndScores: identical, before: a.length, after: b.length, mismatches }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
