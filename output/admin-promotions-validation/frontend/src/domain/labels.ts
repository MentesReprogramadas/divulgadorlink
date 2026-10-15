export const LINK_STATUS: Record<string, string> = {
  PUBLISHED: 'Publicado',
  PENDING_MODERATION: 'Em revisão',
  PRE_REJECTED: 'Rejeitado',
  UNAVAILABLE: 'Indisponível',
  DRAFT: 'Rascunho',
}

export const ORDER_STATUS: Record<string, string> = {
  PENDING_PAYMENT: 'Pendente',
  PAID: 'Pago',
  EXPIRED: 'Expirado',
  PAID_LATE: 'Pago após o prazo',
  REFUND_PENDING: 'Estorno pendente',
  REFUNDED: 'Estornado',
  REFUND_FAILED: 'Estorno falhou',
}

export const SURFACE: Record<string, string> = {
  SEARCH: 'Busca',
  NICHE: 'Nicho',
  HOME: 'Início',
}

export function linkStatusLabel(status: string): string {
  return LINK_STATUS[status] ?? 'Status desconhecido'
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS[status] ?? 'Situação desconhecida'
}

export function surfaceLabel(surface: string): string | null {
  return SURFACE[surface] ?? null
}

export function linkStatusTone(status: string): 'ok' | 'wait' | 'warn' | 'muted' {
  if (status === 'PUBLISHED') return 'ok'
  if (status === 'PENDING_MODERATION') return 'wait'
  if (status === 'PRE_REJECTED' || status === 'UNAVAILABLE') return 'warn'
  return 'muted'
}

export function orderStatusTone(status: string): 'ok' | 'wait' | 'warn' | 'muted' {
  if (status === 'PAID' || status === 'REFUNDED') return 'ok'
  if (status === 'PENDING_PAYMENT' || status === 'PAID_LATE' || status === 'REFUND_PENDING') return 'wait'
  if (status === 'EXPIRED' || status === 'REFUND_FAILED') return 'warn'
  return 'muted'
}
