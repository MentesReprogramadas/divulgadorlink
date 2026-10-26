import { newOrderSeed, randomOrder } from '@/domain/catalog/random-order'
import { PUBLIC_LINK_FILTER } from '@/domain/catalog/public-link'
import {createHash} from 'node:crypto'
import {discoverySql,type DiscoveryMetadata} from '@/domain/catalog/discovery-metadata'

export class InvalidCursorError extends Error {
  constructor() {
    super('cursor')
  }
}

export const CATALOG_DEFAULT_LIMIT = 24
export const CATALOG_MAX_LIMIT = 50

export type CatalogCursor = {
  kind: 'sponsored' | 'organic'
  activatedAt: string | null
  id: string
  seed?: string
  filterKey?: string
}

export function capLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return CATALOG_DEFAULT_LIMIT
  const value = typeof raw === 'string' ? Number(raw) : Number.NaN
  if (!Number.isInteger(value) || value < 1) return CATALOG_DEFAULT_LIMIT
  return Math.min(value, CATALOG_MAX_LIMIT)
}

export function encodeCursor(cursor: CatalogCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeCursor(raw: unknown): CatalogCursor | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') throw new InvalidCursorError()
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    throw new InvalidCursorError()
  }
  if (!parsed || typeof parsed !== 'object') throw new InvalidCursorError()
  const row = parsed as { kind?: unknown; activatedAt?: unknown; id?: unknown; seed?: unknown; filterKey?:unknown }
  if ((row.kind !== 'sponsored' && row.kind !== 'organic') || typeof row.id !== 'string' || row.id.length === 0) {
    throw new InvalidCursorError()
  }
  if (row.activatedAt !== null && typeof row.activatedAt !== 'string') throw new InvalidCursorError()
  if (row.seed !== undefined && (typeof row.seed !== 'string' || !/^[a-f0-9]{32}$/.test(row.seed))) throw new InvalidCursorError()
  if(row.filterKey!==undefined&&(typeof row.filterKey!=='string'||!/^[a-f0-9]{64}$/.test(row.filterKey)))throw new InvalidCursorError()
  return { kind: row.kind, activatedAt: row.activatedAt ?? null, id: row.id, seed: row.seed as string | undefined,...(row.filterKey?{filterKey:row.filterKey as string}:{}) }
}

export function discoveryCursorContext(filters:DiscoveryMetadata,context:unknown,cursor:CatalogCursor|null){
 const key=Object.values(filters).some(Boolean)?createHash('sha256').update(JSON.stringify([context,filters])).digest('hex'):undefined
 if(cursor?.filterKey!==key&&(cursor?.filterKey||key)&&cursor)throw new InvalidCursorError()
 return key
}
export function tagDiscoveryCursor(raw:string|null,key:string|undefined){return raw&&key?encodeCursor({...decodeCursor(raw)!,filterKey:key}):raw}

type Ranked = { id: string; relevance: number; homeActivatedAt: Date | null }

export function pageRanked<T extends Ranked>(
  ranked: { sponsored: T[]; organic: T[] },
  cursor: CatalogCursor | null,
  limit: number,
): { sponsored: T[]; organic: T[]; nextCursor: string | null } {
  const seed = cursor?.seed ?? newOrderSeed()
  const sequence = [...randomOrder(ranked.sponsored, seed), ...randomOrder(ranked.organic, seed)]
  let start = 0
  if (cursor) {
    const index = sequence.findIndex((row) => row.id === cursor.id)
    if (index < 0) throw new InvalidCursorError()
    start = index + 1
  }
  const slice = sequence.slice(start, start + limit)
  const sponsored = slice.filter((row) => row.homeActivatedAt)
  const organic = slice.filter((row) => !row.homeActivatedAt)
  const last = slice.at(-1)
  const next = sequence[start + slice.length]
  const nextCursor = last && next
    ? encodeCursor({
      kind: last.homeActivatedAt ? 'sponsored' : 'organic',
      activatedAt: last.homeActivatedAt ? last.homeActivatedAt.toISOString() : null,
      id: last.id,
      seed,
    })
    : null
  return { sponsored, organic, nextCursor }
}

export function homePageSql(surface: 'HOME' | 'NICHE'): { sponsored: string; organic: string } {
  const sponsored = `
    SELECT l."id", l."name", l."description", l."cityId", l."languageTag", l."modality", (n."requiresAge" OR net."requiresAge") AS "requiresAge",
      n."name" AS "nicheName", n."slug" AS "nicheSlug",
      net."name" AS "networkName", net."slug" AS "networkSlug",
      pmin.activated AS "homeActivatedAt"
    FROM (
      SELECT p."linkId", MIN(p."activatedAt") AS activated
      FROM "promotions" p
      WHERE p."status" = 'ACTIVE' AND (NOT p.administrative OR p."expiresAt" IS NULL OR p."expiresAt" > NOW()) AND p."surface" = '${surface}'::"PromotionSurface"
      GROUP BY p."linkId"
    ) pmin
    JOIN "links" l ON l."id" = pmin."linkId"
    JOIN "niches" n ON n."id" = l."nicheId"
    JOIN "networks" net ON net."id" = l."networkId"
    WHERE l."tenantId" = $1 AND ${PUBLIC_LINK_FILTER}
      AND ($2::text = 'yes' OR NOT (n."requiresAge" OR net."requiresAge"))
      AND ($3::text IS NULL OR n."slug" = $3)
      AND ($4::text IS NULL OR net."slug" = $4)
      ${discoverySql(8)}
      AND ($5::text IS NULL OR (md5($6::text || l."id") COLLATE "C", l."id") > (md5($6::text || $5::text), $5::text))
    ORDER BY md5($6::text || l."id") COLLATE "C" ASC, l."id" ASC
    LIMIT $7
  `
  const organic = `
    SELECT l."id", l."name", l."description", l."cityId", l."languageTag", l."modality", (n."requiresAge" OR net."requiresAge") AS "requiresAge",
      n."name" AS "nicheName", n."slug" AS "nicheSlug",
      net."name" AS "networkName", net."slug" AS "networkSlug",
      NULL::timestamp AS "homeActivatedAt"
    FROM "links" l
    JOIN "niches" n ON n."id" = l."nicheId"
    JOIN "networks" net ON net."id" = l."networkId"
    WHERE l."tenantId" = $1 AND ${PUBLIC_LINK_FILTER}
      AND ($2::text = 'yes' OR NOT (n."requiresAge" OR net."requiresAge"))
      AND ($3::text IS NULL OR n."slug" = $3)
      AND ($4::text IS NULL OR net."slug" = $4)
      ${discoverySql(8)}
      AND NOT EXISTS (
        SELECT 1 FROM "promotions" p
        WHERE p."linkId" = l."id" AND p."status" = 'ACTIVE' AND (NOT p.administrative OR p."expiresAt" IS NULL OR p."expiresAt" > NOW()) AND p."surface" = '${surface}'::"PromotionSurface"
      )
      AND ($5::text IS NULL OR (md5($7::text || l."id") COLLATE "C", l."id") > (md5($7::text || $5::text), $5::text))
    ORDER BY md5($7::text || l."id") COLLATE "C" ASC, l."id" ASC
    LIMIT $6
  `
  return { sponsored, organic }
}
