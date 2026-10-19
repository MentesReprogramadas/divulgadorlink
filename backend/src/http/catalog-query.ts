import { newOrderSeed } from '@/domain/catalog/random-order'
import type { PrismaClient } from '@prisma/client'
import { encodeCursor, homePageSql, discoveryCursorContext, type CatalogCursor } from '@/http/catalog-page'
import {parseDiscovery,type DiscoveryMetadata} from '@/domain/catalog/discovery-metadata'

type Row = DiscoveryMetadata & {
  id: string
  name: string
  description: string
  requiresAge: boolean
  nicheName: string | null
  nicheSlug: string
  networkName: string | null
  networkSlug: string
  homeActivatedAt: Date | null
}

export async function queryCatalogPage(
  db: PrismaClient,
  input: {
    tenantId: string
    age: 'yes' | 'no' | 'unknown'
    surface: 'HOME' | 'NICHE'
    nicheSlug: string | null
    networkSlug: string | null
    limit: number
    cursor: CatalogCursor | null
    filters?:DiscoveryMetadata
  },
): Promise<{ rows: Row[]; nextCursor: string | null }> {
  const filters=parseDiscovery(input.filters??{}),key=discoveryCursorContext(filters,[input.tenantId,input.age,input.surface,input.nicheSlug,input.networkSlug],input.cursor)
  const seed = input.cursor?.seed ?? newOrderSeed()
  const sql = homePageSql(input.surface)
  const sponsored: Row[] = !input.cursor || input.cursor.kind === 'sponsored'
    ? await db.$queryRawUnsafe<Row[]>(
      sql.sponsored,
      input.tenantId,
      input.age,
      input.nicheSlug,
      input.networkSlug,
      input.cursor?.kind === 'sponsored' ? input.cursor.id : null,
      seed,
      input.limit + 1,
      filters.cityId,filters.languageTag,filters.modality,
    )
    : []
  const takeSponsored = Math.min(sponsored.length, input.limit)
  const remain = input.limit - takeSponsored
  const organic: Row[] = remain > 0
    ? await db.$queryRawUnsafe<Row[]>(
      sql.organic,
      input.tenantId,
      input.age,
      input.nicheSlug,
      input.networkSlug,
      input.cursor?.kind === 'organic' ? input.cursor.id : null,
      remain + 1,
      seed,
      filters.cityId,filters.languageTag,filters.modality,
    )
    : []
  const pageSponsored = sponsored.slice(0, takeSponsored)
  const pageOrganic = organic.slice(0, remain)
  const rows = [...pageSponsored, ...pageOrganic]
  const organicPending = remain === 0 && sponsored.length === takeSponsored
    ? (await db.$queryRawUnsafe<Row[]>(
      sql.organic,
      input.tenantId,
      input.age,
      input.nicheSlug,
      input.networkSlug,
      null,
      1,
      seed,
      filters.cityId,filters.languageTag,filters.modality,
    )).length > 0
    : false
  const more = sponsored.length > takeSponsored || organic.length > remain || organicPending
  const last = rows.at(-1)
  return {
    rows,
    nextCursor: more && last
      ? encodeCursor({
        kind: last.homeActivatedAt ? 'sponsored' : 'organic',
        activatedAt: last.homeActivatedAt ? new Date(last.homeActivatedAt).toISOString() : null,
        id: last.id,
        seed,
        ...(key?{filterKey:key}:{}),
      })
      : null,
  }
}
