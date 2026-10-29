import { z } from 'zod'
import { affiliateImageReference } from './image'

export class AffiliateError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}
export const groupJid = z.string().regex(/^\d+(?:-\d+)?@g\.us$/).max(100)
export const entityId = z.string().min(1).max(128)
export const marketUrl = z.string().trim().max(2048).url().refine(raw => {
  if(!URL.canParse(raw)) return false
  const url = new URL(raw)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    ['mercadolivre.com.br', 'mercadolibre.com', 'meli.la'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
}, 'Use um link HTTPS do Mercado Livre.')
// Image URLs are handed to Evolution, so restrict their origin as well as scheme.
export const imageUrl = z.string().max(2048).url().refine(raw => {
  if(!URL.canParse(raw)) return false
  const url = new URL(raw)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    ['mlstatic.com', 'temlinkaqui.com', 'whatsapp.net'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
}, 'Use imagem HTTPS do Mercado Livre, WhatsApp ou Tem Link Aqui.').nullable().optional()
export const groupImage = imageUrl.or(affiliateImageReference)
export const segmentInput = z.object({
  name: z.string().trim().min(2).max(80), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(2).max(80),
  groupName: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(2000).optional(), imageUrl: groupImage,
  capacity: z.number().int().min(2).max(1024).optional(), autoExpand: z.boolean().optional(),
  instanceId: entityId.nullable().optional(),
  instanceIds: z.array(entityId).min(1).max(20).refine(ids=>new Set(ids).size===ids.length,'Selecione conexões sem repetição.').optional(),
  joinMode: z.enum(['REDIRECT', 'SCREEN']).optional(),
  enabled: z.boolean().optional(),
}).strict()
export const offerInput = z.object({
  segmentId: entityId, title: z.string().trim().min(3).max(250), productUrl: marketUrl, affiliateUrl: marketUrl,
  priceCents: z.number().int().min(1).max(100_000_000), oldPriceCents: z.number().int().min(1).max(100_000_000).nullable().optional(),
  imageUrl, note: z.string().trim().max(600).optional(),
  expiresAt: z.iso.datetime().nullable().optional(), checkedAt: z.iso.datetime().optional(),
}).strict()
export type OfferMessage = Pick<z.infer<typeof offerInput>, 'title'|'affiliateUrl'|'priceCents'|'oldPriceCents'|'note'>
const safeText = (text: string) => text.replace(/[\r\n*_~`]/g, ' ').replace(/\s+/g, ' ').trim()
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export function offerMessage(offer: OfferMessage) {
  const saving = offer.oldPriceCents && offer.oldPriceCents > offer.priceCents ? offer.oldPriceCents - offer.priceCents : 0
  const lines = [saving ? '🔥 Olha esse desconto!' : '✨ Um achado para você!', '', `*${safeText(offer.title)}*`, '']
  if (saving) lines.push(`De: ~${money(offer.oldPriceCents!)}~`)
  lines.push(`💰 *${money(offer.priceCents)}*`)
  if (saving) {
    const percent = Math.floor(saving / offer.oldPriceCents! * 100)
    lines.push(`💸 Economize *${money(saving)}*${percent ? ` · ${percent}% OFF` : ''}`)
  }
  if (offer.note) lines.push('', safeText(offer.note))
  lines.push('', 'Confira as opções e aproveite 👇', offer.affiliateUrl, '', '_Preço e estoque podem mudar. Confira as condições na loja._')
  return lines.join('\n')
}
export function groupName(base: string, sequence: number) { return `${base.replace(/\s+#\d+$/, '').trim()} #${sequence}` }
export function validInvite(value: unknown): string {
  if (typeof value !== 'string') throw new AffiliateError(503, 'O WhatsApp não retornou um convite válido.')
  const code = value.startsWith('https://chat.whatsapp.com/') ? value.slice(26) : value
  if (!/^[A-Za-z0-9]{16,64}$/.test(code)) throw new AffiliateError(503, 'O WhatsApp não retornou um convite válido.')
  return `https://chat.whatsapp.com/${code}`
}
export function offerIsCurrent(offer: {status:string; checkedAt:Date; expiresAt:Date|null}, now: Date) {
  return offer.status === 'DRAFT' && offer.checkedAt <= now && now.getTime() - offer.checkedAt.getTime() <= 24 * 60 * 60_000 && (!offer.expiresAt || offer.expiresAt > now)
}
