import { z } from 'zod'
import { affiliateImageReference } from './image'
import { affiliateTitleHasQualifier, compactAffiliateTitle } from './product-title'

export class AffiliateError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}
export const groupJid = z.string().regex(/^\d+(?:-\d+)?@g\.us$/).max(100)
export const entityId = z.string().min(1).max(128)
export const marketUrl = z.string().trim().max(2048).url().refine(raw => {
  if(!URL.canParse(raw)) return false
  const url = new URL(raw)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    ['mercadolivre.com.br', 'mercadolibre.com', 'meli.la', 'shopee.com.br', 'shope.ee'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
}, 'Use um link HTTPS do Mercado Livre ou da Shopee Brasil.')
// Image URLs are handed to Evolution, so restrict their origin as well as scheme.
export const imageUrl = z.string().max(2048).url().refine(raw => {
  if(!URL.canParse(raw)) return false
  const url = new URL(raw)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    ['mlstatic.com', 'temlinkaqui.com', 'whatsapp.net', 'susercontent.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
}, 'Use imagem HTTPS do Mercado Livre, Shopee, WhatsApp ou Tem Link Aqui.').nullable().optional()
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
export type OfferMessage = Pick<z.infer<typeof offerInput>, 'title'|'affiliateUrl'|'priceCents'|'oldPriceCents'|'note'> & {headline?:string;showHeadline?:boolean;reportedDiscountPercent?:number|null;oldPriceEstimated?:boolean}
const safeText = (text: string) => text.replace(/[\r\n*_~`]/g, ' ').replace(/\s+/g, ' ').trim()
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const emojiPattern=/\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\uFE0F|\u200D|\u20E3/gu
const compactCopyText=(text:string)=>safeText(text).replace(/(\d)\s*[–—]\s*(?=\d)/g,'$1 a ').replace(/[–—]/g,' ').replace(emojiPattern,'').replace(/\s+/g,' ').trim()
type OfferPrice = Pick<OfferMessage, 'priceCents'|'oldPriceCents'|'oldPriceEstimated'|'reportedDiscountPercent'>
export const strongOfferDiscount = 50

export function offerDiscount(offer: OfferPrice) {
  const rate = offer.reportedDiscountPercent
  const reported = typeof rate === 'number' && Number.isInteger(rate) && rate > 0 && rate < 100 ? rate : 0
  const previous = offer.oldPriceCents
  return !offer.oldPriceEstimated && previous && previous > offer.priceCents
    ? Math.floor((previous - offer.priceCents) * 100 / previous)
    : reported
}

export function headlineWithoutPrice(headline: string, price: OfferPrice): string {
  if (!/[\d$%]/.test(headline)) return headline
  if (offerDiscount(price) < strongOfferDiscount) return ''
  const match = /^(.*?)\bpor menos de R\$\s*(\d{1,3})(?:,([0-9]{2}))?([!.]?[^\p{L}\p{N}$%]*)$/iu.exec(headline)
  if (!match) return ''
  const limit = Number(match[2]) * 100 + Number(match[3] ?? 0)
  if (price.priceCents >= limit || /[\d$%]/.test(match[1])) return ''
  return match[1].trim()
}

export function offerMessage(offer: OfferMessage) {
  return productOfferMessage(offer, true)
}

function productOfferMessage(offer: OfferMessage, useProductEmojis: boolean) {
  const discount = offerDiscount(offer)
  const title = compactAffiliateTitle(compactCopyText(offer.title))
  const headline = offer.showHeadline ? compactCopyText(offer.headline ?? '') : ''
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const normalizedTitle = normalize(title)
  const normalizedHeadline = normalize(headline)
  const repeatsTitle = normalizedHeadline === normalizedTitle
    || (normalizedTitle.includes(' ') && ` ${normalizedHeadline} `.includes(` ${normalizedTitle} `))
  const usableHeadline = headline.length >= 8 && headline.length <= 60 && !repeatsTitle
    && Boolean(headlineWithoutPrice(headline, offer))
    && (discount >= strongOfferDiscount || !/\b(?:oferta|achado|perca|corra|aproveit\w*)\b/iu.test(headline))
  const emoji = usableHeadline ? offer.headline?.match(/\p{Extended_Pictographic}/u)?.[0] : undefined
  const price = `🔥 *${money(offer.priceCents)}*${discount ? ` | ${useProductEmojis ? '💥 ' : ''}${discount}% OFF` : ''}`
  const link = `Confira o produto aqui${useProductEmojis ? ' 👇' : ''}\n${offer.affiliateUrl}`
  const productEmoji = emoji ?? (/\b(?:bebedouro|fonte de agua)\b/.test(normalizedTitle) ? '💧' : '🛍️')
  const opening = !useProductEmojis && emoji ? `${emoji} ${headline}` : headline
  const productLine = useProductEmojis ? `${productEmoji} ${title}` : title
  return [...(usableHeadline ? [opening] : []), productLine, price, link].join('\n\n')
}

// These formats are read only for previews and schedules already signed.
function spacedOfferMessage(offer: OfferMessage, discount: number) {
  const normalize = (value: string) => compactCopyText(value).normalize('NFD')
    .replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const product = normalize(offer.title)
  const headline = offer.showHeadline ? compactCopyText(offer.headline ?? '') : ''
  const usableHeadline = headline.length >= 8 && headline.length <= 60
    && normalize(headline) !== product
    && (!product.includes(' ') || !` ${normalize(headline)} `.includes(` ${product} `))
    && !/\b(?:confira|conheça|conheca|corra|aproveit\w*)\b/iu.test(headline)

  let fallback = 'Uma ideia para o seu dia a dia'
  if (/\b(?:pisca|luzes|iluminacao)\b/.test(product)) fallback = 'Dê um toque de luz à decoração'
  else if (/\bnatal\b/.test(product)) fallback = 'Entre no clima de Natal com a decoração'
  else if (/\b(?:gato|gatos|cao|caes|pet|cachorro)\b/.test(product)) fallback = 'Um cuidado a mais na rotina do seu pet'
  else if (/\b(?:camiseta|blusa|tenis|calca)\b/.test(product)) fallback = 'Uma ideia para montar o look do dia'

  const gift = /\b(?:presente|presentear)\b/.test(normalize(headline))
  const priceLimit = (Math.floor(offer.priceCents / 500) + 1) * 5
  const variation = [...product].reduce((sum, char) => (sum + char.charCodeAt(0)) % 3, 0)
  let opportunity: string | undefined
  if (discount >= 50) {
    if (gift && priceLimit <= 100) {
      const giftLabel = /\bnatal\b/.test(normalize(headline)) ? 'Presente de Natal' : 'Ideia de presente'
      opportunity = `🎁 ${giftLabel} por menos de R$ ${priceLimit}!`
    } else {
      opportunity = ['✨ Olha esse achado!', '✨ Não perca esta oferta!', '✨ Um achado por esse preço!'][variation]
    }
  }

  const opening = usableHeadline && !(opportunity && gift) ? headline : fallback
  const emoji = usableHeadline ? offer.headline?.match(/\p{Extended_Pictographic}/u)?.[0] : '✨'
  const price = `🔥 *${money(offer.priceCents)}*${discount ? ` | ${discount}% OFF` : ''}`
  if (opportunity) return [opportunity, opening, price, offer.affiliateUrl].join('\n\n')
  const link = emoji ? offer.affiliateUrl : `🛒 ${offer.affiliateUrl}`
  return [emoji ? `${emoji} ${opening}` : opening, price, link].join('\n\n')
}

function previousCompactOfferMessage(offer:OfferMessage) {
  const title=compactAffiliateTitle(compactCopyText(offer.title))
  const headline=offer.showHeadline&&offer.headline?compactCopyText(offer.headline):''
  const usableHeadline=headline.length>=8&&headline.length<=60&&!/\b(?:confira|conheça|conheca|corra|aproveit\w*)\b/iu.test(headline)
  const variation=[...title].reduce((sum,char)=>(sum+char.codePointAt(0)!)%3,0)
  const normalized=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
  const showProduct=affiliateTitleHasQualifier(title)||usableHeadline&&!normalized(headline).includes(normalized(title))
  const categoryEmoji=usableHeadline?offer.headline!.match(/\p{Extended_Pictographic}/u)?.[0]:undefined
  const opening=usableHeadline?`${categoryEmoji?categoryEmoji+' ':''}${headline}`:title
  const price=showProduct&&usableHeadline?`${title} | *${money(offer.priceCents)}*`:`🔥 *${money(offer.priceCents)}*`
  const linkEmoji=variation===2?'🔗':'🛒'
  const link=categoryEmoji&&price.startsWith('🔥')?offer.affiliateUrl:`${linkEmoji} ${offer.affiliateUrl}`
  return [opening,price,link,'Publicidade'].join('\n')
}

// Keep exact previously signed text valid; never use the legacy layout for new previews.
export function legacyOfferMessage(offer: OfferMessage) {
  const saving = offer.oldPriceCents && offer.oldPriceCents > offer.priceCents ? offer.oldPriceCents - offer.priceCents : 0
  const rate=offer.reportedDiscountPercent
  const reportedDiscount=typeof rate==='number'&&Number.isInteger(rate)&&rate>0&&rate<=100?rate:0
  const title=safeText(compactAffiliateTitle(offer.title))
  const lines = [...(offer.showHeadline&&offer.headline?[safeText(offer.headline)]:[]),`*${title}*`, '']
  if (saving) lines.push(`De: ~${money(offer.oldPriceCents!)}~`)
  lines.push(`🔥 *${money(offer.priceCents)}*`)
  if (saving) {
    const percent = offer.oldPriceEstimated&&reportedDiscount?reportedDiscount:Math.floor(saving / offer.oldPriceCents! * 100)
    lines.push(`💸 ${percent ? `*${percent}% OFF* · ` : ''}Economize *${money(saving)}*`)
  } else if(reportedDiscount) lines.push(`💸 *${reportedDiscount}% OFF*`)
  if (offer.note) lines.push('', safeText(offer.note))
  lines.push('', 'Compre aqui 👇', offer.affiliateUrl)
  return lines.join('\n')
}
export function offerMessageMatches(offer:OfferMessage,message:string){
  return message===offerMessage(offer)||message===productOfferMessage(offer,false)||message===spacedOfferMessage(offer,offerDiscount(offer))||message===spacedOfferMessage(offer,0)||message===previousCompactOfferMessage(offer)||message===legacyOfferMessage(offer)
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
