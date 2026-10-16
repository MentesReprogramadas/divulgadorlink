import { canonicalUrl } from '@/domain/links/canonical-url'
import { hostMatchesNetwork } from '@/domain/links/network-host'

export class AvailabilityError extends Error {
  constructor(readonly code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID', message?: string) { super(message ?? { NOT_FOUND: 'Recurso não encontrado.', CONFLICT: 'O link foi atualizado. Recarregue antes de continuar.', INVALID: 'Não foi possível validar o endereço. Revise a URL e tente novamente.' }[code]) }
}
export type AvailabilityActor = { tenantId: string; actorId: string }
export type AvailabilityContext = AvailabilityActor & { linkId: string }
export type ProposalContext = { canonicalUrl: string; version: number; knownHosts: string[] }
export type UrlDecisionInput = AvailabilityActor & { revisionId: string; expectedVersion: number; decision: 'APPROVE' | 'REJECT'; reason: string; requestId: string; now: Date }
export type UrlProbe = (url: string) => Promise<number | null>
export interface LinkAvailabilityRepository {
  read(input: AvailabilityContext): Promise<unknown>
  proposalContext(input: AvailabilityContext): Promise<ProposalContext>
  propose(input: AvailabilityContext & { canonicalUrl: string; sourceUrl: string; expectedVersion: number; now: Date }): Promise<unknown>
  pending(input: AvailabilityActor & { cursor?: string }): Promise<unknown>
  decisionContext(input: UrlDecisionInput): Promise<{ canonicalUrl: string; knownHosts: string[] }>
  decide(input: UrlDecisionInput): Promise<unknown>
}

export async function proposeUrl(input: AvailabilityContext & { canonicalUrl: string; expectedVersion: number }, repository: LinkAvailabilityRepository, probe: UrlProbe, now = new Date()) {
  const context = await repository.proposalContext(input)
  if (context.version !== input.expectedVersion) throw new AvailabilityError('CONFLICT')
  let url: string
  try {
    const parsed = new URL(input.canonicalUrl)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || input.canonicalUrl.length > 2048 || !hostMatchesNetwork(parsed.hostname, context.knownHosts)) throw new Error('url')
    url = canonicalUrl(input.canonicalUrl)
  } catch { throw new AvailabilityError('INVALID') }
  const status = await probe(url)
  if (status === null || status < 200 || status >= 300) throw new AvailabilityError('INVALID')
  return repository.propose({ ...input, canonicalUrl: url, sourceUrl: context.canonicalUrl, now })
}

export async function decideUrl(input: UrlDecisionInput, repository: LinkAvailabilityRepository, probe: UrlProbe) {
  const context = await repository.decisionContext(input)
  if (input.decision === 'APPROVE') {
    if (!hostMatchesNetwork(new URL(context.canonicalUrl).hostname, context.knownHosts)) throw new AvailabilityError('INVALID')
    const status = await probe(context.canonicalUrl)
    if (status === null || status < 200 || status >= 300) throw new AvailabilityError('INVALID', 'A correção ainda não está acessível. A proposta e o saldo foram preservados.')
  }
  return repository.decide(input)
}
