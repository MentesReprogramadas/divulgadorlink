import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
export class RelatedCursorError extends Error { constructor() { super('Cursor de relacionados inválido.') } }

export const RELATED_PAGE_SIZE = 6
export type RelatedSource = { id: string; tenantId: string; canonicalUrl: string; nicheId: string; networkId: string }
export type RelatedCandidate = RelatedSource & { status: string; ownerStatus: string | null; requiresAge: boolean }
export function relatedRank(source: RelatedSource, candidate: RelatedSource): number | null {
  if (candidate.nicheId === source.nicheId) return candidate.networkId === source.networkId ? 0 : 1
  return candidate.networkId === source.networkId ? 2 : null
}
export function relatedShuffleKey(id: string, seed: string): string { return createHash('md5').update(seed + id).digest('hex') }
export function selectRelated<T extends RelatedCandidate>(rows: T[], source: RelatedSource, age: string, seed?: string): T[] {
  const seenIds = new Set<string>(), seenUrls = new Set<string>()
  return rows.filter(r => r.tenantId === source.tenantId && r.id !== source.id && r.canonicalUrl !== source.canonicalUrl && r.status === 'PUBLISHED' && r.ownerStatus !== 'BANNED' && (!r.requiresAge || age === 'yes') && relatedRank(source, r) !== null)
    .sort((a, b) => relatedRank(source, a)! - relatedRank(source, b)! || (seed ? relatedShuffleKey(a.id, seed).localeCompare(relatedShuffleKey(b.id, seed)) : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .filter(r => { if (seenIds.has(r.id) || seenUrls.has(r.canonicalUrl)) return false; seenIds.add(r.id); seenUrls.add(r.canonicalUrl); return true })
}
type Context = RelatedSource & { age: string }
type Cursor = { rank: number; id: string; seed: string }
function mac(body: string, context: Context, secret: string) { return createHmac('sha256', secret).update(JSON.stringify(['related.cursor.v2', context.tenantId, context.id, context.canonicalUrl, context.nicheId, context.networkId, context.age, body])).digest('base64url') }
export function encodeRelatedCursor(cursor: Cursor, context: Context, secret: string) {
  const body = Buffer.from(JSON.stringify(cursor)).toString('base64url')
  return body + '.' + mac(body, context, secret)
}
export function decodeRelatedCursor(raw: string | undefined, context: Context, secret: string): Cursor | null {
  if (raw === undefined) return null
  try {
    if (raw.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(raw)) throw new Error('cursor')
    const [body, signature] = raw.split('.') as [string, string]
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(mac(body, context, secret)))) throw new Error('cursor')
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('cursor')
    const value = parsed as { rank?: unknown; id?: unknown; seed?: unknown }
    if (Object.keys(value).length !== 3 || typeof value.seed !== 'string' || !/^[a-f0-9]{32}$/.test(value.seed) || !Number.isInteger(value.rank) || Number(value.rank) < 0 || Number(value.rank) > 2 || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)) throw new Error('cursor')
    return { rank: Number(value.rank), id: value.id, seed: value.seed }
  } catch { throw new RelatedCursorError() }
}
