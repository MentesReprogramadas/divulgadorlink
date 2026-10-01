import { PrismaClient } from '@prisma/client'
import { homePageSql } from '@/http/catalog-page'
import { hybridSearchSql } from '@/use-cases/@Search/rank-links'
import { EMBEDDING_DIMENSIONS } from '@/domain/embeddings/embedding-service'

const url = process.env.EXPLAIN_DATABASE_URL
if (!url || !url.includes('divulgador_perf')) throw new Error('EXPLAIN_DATABASE_URL precisa apontar para divulgador_perf')
const db = new PrismaClient({ datasources: { db: { url } } })

type Plan = Array<{ 'QUERY PLAN': string }>

async function explain(label: string, sql: string, ...params: unknown[]) {
  const runs: number[] = []
  let plan: string[] = []
  for (let i = 0; i < 5; i += 1) {
    const rows = await db.$queryRawUnsafe<Plan>(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${sql}`, ...params)
    plan = rows.map((row) => row['QUERY PLAN'])
    const time = plan.find((line) => line.startsWith('Execution Time'))
    runs.push(Number(time?.match(/[\d.]+/)?.[0] ?? NaN))
  }
  const sorted = [...runs].sort((a, b) => a - b)
  const scans = plan.filter((line) => /Seq Scan|Index (Only )?Scan|Bitmap/.test(line)).map((line) => line.trim().replace(/\s+\(actual.*$/, ''))
  console.log(JSON.stringify({ label, medianMs: sorted[2], minMs: sorted[0], maxMs: sorted[4], scans: [...new Set(scans)] }))
}

async function main() {
  const home = homePageSql('HOME')
  const niche = homePageSql('NICHE')
  const mid = await db.$queryRawUnsafe<Array<{ activatedAt: Date; linkId: string }>>(
    `SELECT "activatedAt", "linkId" FROM promotions WHERE status = 'ACTIVE' AND surface = 'HOME' ORDER BY "activatedAt", "linkId" OFFSET 100 LIMIT 1`,
  )
  const cursor = mid[0]!

  await explain('home.sponsored.first', home.sponsored, 't1', 'no', null, null, null, null, 26)
  await explain('home.sponsored.deep', home.sponsored, 't1', 'no', null, null, cursor.activatedAt.toISOString(), cursor.linkId, 26)
  await explain('home.organic.first', home.organic, 't1', 'no', null, null, null, 26)
  await explain('home.organic.deep', home.organic, 't1', 'no', null, null, 'l0090000', 26)
  await explain('niche.sponsored.first', niche.sponsored, 't1', 'no', 'n1', null, null, null, 26)
  await explain('niche.organic.deep', niche.organic, 't1', 'no', 'n1', null, 'l0090000', 26)
  await explain('network.organic.first', niche.organic, 't1', 'no', null, 'w1', null, 26)
  await explain('network.organic.deep', niche.organic, 't1', 'no', null, 'w1', 'l0090000', 26)

  await explain(
    'suggest.ilike',
    `SELECT l."id", l."name" FROM "links" l JOIN "niches" n ON n."id" = l."nicheId"
     WHERE l."tenantId" = $1 AND l."status" = 'PUBLISHED' AND ($2::text = 'yes' OR n."requiresAge" = false)
       AND l."name" ILIKE '%' || $3 || '%' LIMIT 8`,
    't1', 'no', 'Link 4242',
  )

  const vector = `[${Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => Math.sin(i)).join(',')}]`
  await explain('search.hybrid', hybridSearchSql(), 'Link 4242', vector, 't1', 'no', 0.4, 0.6, 0.35)

  await explain(
    'analytics.totals',
    `SELECT kind, COUNT(*)::int AS n FROM analytics_events
     WHERE "tenantId" = $1 AND "linkId" = $2 AND day >= $3::date AND day <= $4::date GROUP BY kind`,
    't1', 'l0000037', '2026-08-01', '2026-09-30',
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
