import { createHmac } from 'node:crypto'
import {measurementTrafficAllowed} from '@/domain/analytics/measurement-policy'
export const SEARCH_SAMPLE_THRESHOLD = 10
export const SEARCH_RETENTION_DAYS = 180
export const SEARCH_DAILY_LIMIT = 60
export function normalizedSearchTerm(raw: string): string | null {
  const term = raw.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pt-BR')
  if (!term || term.length > 120 || term.includes('@') || /https?:|www\.|[?=&]/u.test(term) || term.replace(/\D/gu, '').length >= 7 || /\b(?:cpf|cnpj|rg|senha|password|token|meu telefone|minha chave|meu e-?mail)\b/u.test(term)) return null
  // Control characters and long opaque identifiers are not useful public demand signals.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000e-\u001f\u007f]/u.test(term) || /\S{41,}/u.test(term)) return null
  return term
}
export function canObserveSearch(input: { consent?: string; userAgent?: string; testTraffic?: string; dnt?: string; gpc?: string }) {
  return input.consent === 'marketing' && measurementTrafficAllowed(input)
}
export function searchSessionKey(tenantId: string, session: string, day: string, secret: string) {
  return createHmac('sha256', secret).update(JSON.stringify(['search-observation.v1', tenantId, day, session])).digest('hex')
}
export const hasSearchSample = (count: number) => count >= SEARCH_SAMPLE_THRESHOLD
export const searchOutcome = (input: { failed: boolean; gated: boolean; count: number }) => input.failed ? 'FAILED' : input.gated ? 'GATED' : 'SUCCESS'
