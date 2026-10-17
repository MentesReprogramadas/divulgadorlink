import { ContentReviewRequired } from '@/domain/moderation/content-review'
import type { Prisma } from '@prisma/client'
import { assertPublicHttps } from '@/adapters/http/safe-fetch'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { decideProposedText, type ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { ProfileError, type ProfileContent } from '@/domain/profiles/profile'
export { publicContentValidationPorts as profileValidationPorts } from '@/use-cases/public-content-validation-ports'
import type { PublicContentValidationPorts as ProfileValidationPorts } from '@/use-cases/public-content-validation-ports'
export type { PublicContentValidationPorts as ProfileValidationPorts } from '@/use-cases/public-content-validation-ports'
export async function validateProfile(db: Prisma.TransactionClient, tenantId: string, content: ProfileContent, ports: ProfileValidationPorts, humanApproved = false): Promise<ProfileContent> {
  const [terms, banned, threshold] = await Promise.all([db.blocklistTerm.findMany({ where: { tenantId } }), db.link.findMany({ where: { tenantId, owner: { tenantId, status: 'BANNED' } }, select: { canonicalUrl: true } }), db.config.findUnique({ where: { tenantId_key: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } } })])
  const text = [content.name, content.bio, ...content.categories.map(c => c.name), ...content.items.map(i => i.label)].join('\n')
  const blocklisted = hitsBlocklist({ text, selectedNiche: '', nicheNames: [], terms: terms.map(t => t.term) })
  const result: ProfileContent = { ...content, items: content.items.map(i => ({ ...i })) }
  const destinations = new Set<string>()
  for (const item of result.items) {
    if (item.type === 'CATALOG') continue
    try { assertPublicHttps(item.destination); item.destination = canonicalUrl(item.destination) } catch { throw new ProfileError(422, 'Use destinos HTTPS públicos, sem credenciais ou portas especiais. O rascunho foi mantido.') }
    if (banned.some(b => canonicalUrl(b.canonicalUrl) === item.destination)) throw new ProfileError(422, 'Um destino está bloqueado. Corrija o rascunho antes de publicar.')
    destinations.add(item.destination)
  }
  const pending = [...destinations], deadline = Date.now() + 25000
  let index = 0, failed = false
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (!failed && index < pending.length) {
      const url = pending[index++]!
      if (Date.now() > deadline) { failed = true; throw new ProfileError(503, 'A validação dos destinos demorou. O rascunho foi mantido; tente novamente.') }
      const status = await ports.probe(url)
      if (status === null) { failed = true; throw new ProfileError(503, 'Não foi possível validar um destino. O rascunho foi mantido; tente novamente.') }
      if (status < 200 || status >= 400) { failed = true; throw new ProfileError(422, 'Um destino está indisponível ou não é permitido. Corrija o rascunho antes de publicar.') }
    }
  }))
  if (humanApproved) return result
  if (blocklisted) throw new ContentReviewRequired()
  const limit = Number(threshold?.value)
  if (!Number.isFinite(limit) || limit < 0 || limit > 1 || !threshold) throw new ContentReviewRequired()
  let verdict: ModelVerdict
  try { verdict = await ports.judge({ name: content.name, description: text, niche: 'Perfil público: conteúdo permitido e grupos pessoais, sem exigir correspondência com nicho do catálogo' }) } catch { throw new ContentReviewRequired() }
  if (!verdict) throw new ContentReviewRequired()
  if (decideProposedText({ publishedName: '', proposedName: content.name, blocklisted: false, threshold: limit, verdict }).decision !== 'PUBLISH') throw new ContentReviewRequired()
  return result
}
