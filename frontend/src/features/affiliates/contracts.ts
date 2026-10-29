import { api } from '@/lib/api'

export type AffiliateInstance = { id: string; name: string; enabled: boolean; configured: boolean; ownerPhone?: string | null }
export type AffiliateInviteMetrics = { views: number; buttonClicks: number; automaticRedirects: number; buttonRedirects: number; createdAt: string }
export type AffiliateSegment = { id: string; name: string; groupName?: string | null; slug: string; joinMode?: 'REDIRECT' | 'SCREEN'; inviteMetrics?: AffiliateInviteMetrics | null; description: string; imageUrl: string | null; capacity: number; autoExpand: boolean; instanceId: string | null; instanceIds?: string[]; instances?: Array<{ id: string; name: string; enabled: boolean }>; enabled: boolean; provisionState: string; _count?: { groups: number; offers: number } }
export type AffiliateGroup = { id: string; name: string; jid: string; segmentId: string; instanceId: string; participantCount: number; capacity: number; enabled: boolean; syncedAt: string | null; segment?: AffiliateSegment; instance?: AffiliateInstance }
export type AffiliateOffer = { id: string; segmentId: string; title: string; productUrl: string; affiliateUrl: string; priceCents: number; oldPriceCents: number | null; imageUrl: string | null; note: string; status: string; checkedAt: string; expiresAt: string | null; segment?: AffiliateSegment }
export type AffiliateBroadcast = { id: string; offerId: string; message: string; scheduledAt: string; createdAt: string; imageUrl?: string | null; snapshotAvailable?: boolean; offer?: Pick<AffiliateOffer, 'id' | 'title' | 'imageUrl'> & {priceCents:number | null;oldPriceCents:number | null;affiliateUrl:string | null;segment?:AffiliateSegment}; _count?: { deliveries: number } }
export type AffiliateDelivery = { id: string; state: string; errorCode: string | null; providerMessageId: string | null; updatedAt: string; group?: AffiliateGroup; broadcast?: AffiliateBroadcast }
export type AffiliateSnapshot = { instances: AffiliateInstance[]; segments: AffiliateSegment[]; groups: AffiliateGroup[]; offers: AffiliateOffer[]; broadcasts: AffiliateBroadcast[]; deliveries: AffiliateDelivery[]; readiness?: { activeGroups: number; currentOffers: number; approvedDeliveries: number; nextOffer?: AffiliateOffer | null }; summary: Record<'segments' | 'groups' | 'instances' | 'offers' | 'pending' | 'sent' | 'uncertain' | 'failed', number> }
export type CatalogProduct = { id: string; catalogId?: string; title: string; productUrl: string; priceCents: number; oldPriceCents: number | null; imageUrl: string | null; checkedAt: string }
export type OfferSeed = Partial<CatalogProduct> & { productUrl: string; affiliateUrl?: string }
export type CatalogSession = { mode: 'CENTRAL' | 'OWN' | 'DISCONNECTED'; configured: boolean; verified: boolean; status: 'CONFIGURED' | 'CONNECTED' | 'RECONNECT' | 'DISCONNECTED' | 'NOT_CONFIGURED'; accountLabel: string; tag: string; profile: string; updatedAt?: string }
export type CatalogStatus = { mode?: 'CENTRAL' | 'OWN'; configured: boolean; connected: boolean; status: string; clientId: string | null; accountId?: string; catalogError?: string; redirectUri: string; affiliateConfigured: boolean; affiliateTag?: string | null; affiliateProfile?: string | null; session?: CatalogSession }

export const affiliatePath = '/v1/admin/affiliates'
export async function affiliateRequest<T>(path = '', method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const result = await api<T & { message?: string }>(affiliatePath + path, { method, headers: { 'x-workspace-owner': 'self' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...(signal ? { signal } : {}) })
  if (result.status < 200 || result.status >= 300) throw new Error(result.body.message ?? (result.status === 403 ? 'Acesso restrito aos administradores ativos.' : 'Não foi possível concluir. Tente novamente.'))
  return result.body
}
export function localDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}
export function inputDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
export function cents(value: string): number {
  const normalized = value.trim().replace(/\s/g, '').replace(/^R\$/, '')
  const number = /^\d+(?:,\d{1,2})?$/.test(normalized) ? Number(normalized.replace(',', '.')) : /^\d+(?:\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN
  if (!Number.isFinite(number) || number <= 0 || Math.round(number * 100) > 100_000_000) throw new Error('Informe um preço válido, como 39,90. Não use separador de milhar.')
  return Math.round(number * 100)
}
export const deliveryLabels: Record<string, string> = { PENDING: 'Na fila', RETRY: 'Aguardando tentativa', SENDING: 'Enviando', SENT: 'Enviado', UNCERTAIN: 'Conferência necessária', FAILED: 'Falhou', DEAD: 'Falhou', CANCELLED: 'Cancelado', SKIPPED: 'Ignorado' }

export function nextSegmentOffer(snapshot: AffiliateSnapshot) {
  if (snapshot.readiness?.nextOffer !== undefined) return snapshot.readiness.nextOffer
  return snapshot.offers.find(offer => offer.status === 'DRAFT' && !snapshot.broadcasts.some(broadcast => broadcast.offerId === offer.id)) ?? null
}

export type DiscoveryState = { enabled: boolean; usesSegmentName: boolean; terms: string[]; products: DiscoveryProduct[]; expandedTerms?: string[]; collectionSummary?: {available:number;unavailable:number;failed:number}; unavailable?: Array<{id:string;title:string;reason:string;kind?:'NO_LISTINGS'|'INELIGIBLE'|'PRICE_UNAVAILABLE'|'LOOKUP_FAILED'}>; rejected?: Array<{id:string;title:string;reason:string}>; pageStatus?: 'NOT_COLLECTED' | 'READY'; policy?: {version:string;reportedDiscountPercent:number;historyDropPercent:number;minimumHistoryDays:number;historyWindowDays:number}; pagination?: {mode?: 'MIXED' | 'SOURCE'; term: string; page: number; pageSize: number; total: number; hasPrevious: boolean; hasNext: boolean}; statusCounts?: Record<'SELECTED' | 'REVIEW' | 'DISCARDED', number>; cycleIntervalMs?: number; runStartedAt?: string | null; durationMs?: number | null; counts: { catalogsFound: number; catalogsChecked: number; withoutOffers: number; failed: number } | null; checkedAt: string | null; nextRunAt: string | null; status: 'QUEUED' | 'RUNNING' | 'READY' | 'ERROR' | 'PAUSED'; error: string | null }

export type DiscoveryProduct = CatalogProduct & { sourceTerm?: string; sourcePage?: number; decision?: 'SENT' | 'DISCARDED'; evaluation?: { status: 'SELECTED' | 'REVIEW' | 'DISCARDED'; rulesVersion: string; reasons: string[]; reportedDiscountPercent: number | null; history: { days: number; medianPriceCents: number | null; dropPercent: number | null; verified: boolean; windowDays: number }; reputation: { level: string | null; status: 'GREEN' | 'POOR' | 'UNKNOWN' } } }
export type ProductPreview = { previewToken: string; expiresAt: string; product: CatalogProduct; title: string; headline?:string; message: string; affiliateUrl: string; fullUrl?: string; destinations: {segmentId: string; name: string; groups: Array<{id: string; name: string}>; count: number}; titleSource: 'OPENAI' | 'ORIGINAL'; priceChanged: boolean }
export type BroadcastCounts = {pending: number; sending: number; sent: number; failed: number; uncertain: number; cancelled?: number}
export type BroadcastPage = {broadcasts: Array<AffiliateBroadcast & {segmentId: string; segment?: {id: string; name: string}; counts: BroadcastCounts}>; nextCursor: string | null; totalCount: number}
