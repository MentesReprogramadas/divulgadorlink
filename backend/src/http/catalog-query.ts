import { newOrderSeed } from '@/domain/catalog/random-order'
import type { PrismaClient } from '@prisma/client'
import { encodeCursor, homePageSql, discoveryCursorContext, type CatalogCursor } from '@/http/catalog-page'
import {parseDiscovery,type DiscoveryMetadata} from '@/domain/catalog/discovery-metadata'
import {discoverySql} from '@/domain/catalog/discovery-metadata'
import {PUBLIC_LINK_FILTER} from '@/domain/catalog/public-link'

export async function hasRestrictedCatalogContent(db: PrismaClient, input: {tenantId:string;nicheSlug:string|null;networkSlug:string|null;filters?:DiscoveryMetadata}): Promise<boolean> {
  const filters=parseDiscovery(input.filters??{})
  const [result]=await db.$queryRawUnsafe<Array<{exists:boolean}>>(`SELECT EXISTS (
    SELECT 1 FROM links l JOIN niches n ON n.id=l."nicheId" JOIN networks net ON net.id=l."networkId"
    WHERE l."tenantId"=$1 AND ${PUBLIC_LINK_FILTER}
      AND (n."requiresAge" OR net."requiresAge")
      AND ($2::text IS NULL OR n.slug=$2) AND ($3::text IS NULL OR net.slug=$3)
      ${discoverySql(4)}
  ) AS exists`,input.tenantId,input.nicheSlug,input.networkSlug,filters.cityId,filters.languageTag,filters.modality)
  return result?.exists===true
}

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
