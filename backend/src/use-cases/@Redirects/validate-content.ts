import type { Prisma } from '@prisma/client'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { canonicalUrl } from '@/domain/links/canonical-url'
import type { DestinationInput } from '@/domain/redirects/redirect-input'
import { decideProposedText, type ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
import { RedirectError, validateRedirectDestination } from './validate-destination'

export async function validateRedirectContent(db: Prisma.TransactionClient, tenantId: string, input: DestinationInput, ports: PublicContentValidationPorts): Promise<string> {
  const destination = await validateRedirectDestination(input.destinationUrl, ports.probe)
  const [terms, banned, threshold] = await Promise.all([
    db.blocklistTerm.findMany({ where: { tenantId }, select: { term: true } }),
    db.link.findMany({ where: { tenantId, owner: { status: 'BANNED', tenantId } }, select: { canonicalUrl: true } }),
    db.config.findUnique({ where: { tenantId_key: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } } }),
  ])
  if (hitsBlocklist({ text: input.label, selectedNiche: '', nicheNames: [], terms: terms.map(t => t.term) }) || banned.some(l => canonicalUrl(l.canonicalUrl) === destination)) throw new RedirectError(422, 'Conteúdo não permitido. Corrija o destino ou o título; o destino anterior foi mantido.')
  const limit = Number(threshold?.value)
  if (!threshold || !Number.isFinite(limit) || limit < 0 || limit > 1) throw new RedirectError(503, 'Validação automática indisponível. O destino anterior foi mantido.')
  let verdict: ModelVerdict
  try { verdict = await ports.judge({ name: input.label, description: input.label, niche: 'Convite permanente: avaliar conteúdo permitido, sem exigir nicho do catálogo' }) }
  catch { throw new RedirectError(503, 'Validação automática indisponível. O destino anterior foi mantido.') }
  if (!verdict) throw new RedirectError(503, 'Validação automática inconclusiva. O destino anterior foi mantido.')
  if (decideProposedText({ publishedName: '', proposedName: input.label, blocklisted: false, threshold: limit, verdict }).decision !== 'PUBLISH') throw new RedirectError(422, 'Conteúdo suspeito. Corrija o título ou destino; o destino anterior foi mantido.')
  return destination
}
