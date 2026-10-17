export const AVAILABILITY_LABEL = { UNKNOWN: 'Ainda não verificado', ACCESSIBLE: 'Destino acessível', SUSPECT: 'Falha em acompanhamento', INCONCLUSIVE: 'Checagem inconclusiva', UNAVAILABLE: 'Aguardando correção' } as const
export const REVISION_LABEL = { PENDING: 'Em análise', APPROVED: 'Aprovada', REJECTED: 'Recusada' } as const
export type UrlRevision = { id: string; canonicalUrl: string; status: keyof typeof REVISION_LABEL; createdAt: string; decidedAt: string | null; decisionReason: string | null }
export type AvailabilityData = {
  link: { id: string; name: string; canonicalUrl: string; status: string }
  availability: { version: number; state: keyof typeof AVAILABILITY_LABEL; checkedAt: string | null; disabledAt: string | null; failures: number }
  proposals: UrlRevision[]
  pausedPromotions: Array<{ id: string; surface: string; remainingMs: number | null; pausedAt: string | null }>
  canPropose: boolean
}
export type UrlProposal = UrlRevision & { linkId: string; sourceUrl: string; version: number | null; link: { name: string; status: string } }
export type UrlDecision = { decision: 'APPROVE' | 'REJECT'; reason: string; expectedVersion: number }
export function availabilityDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) }
export function remainingTime(value: number | null) {
  if (value === null) return 'Prazo sem término registrado'
  const minutes = Math.ceil(value / 60000), days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60)
  return `${days}d ${hours}h ${minutes % 60}min`
}
