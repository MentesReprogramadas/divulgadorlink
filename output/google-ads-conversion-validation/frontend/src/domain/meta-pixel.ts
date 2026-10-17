type Fbq = (...args: unknown[]) => void

export type MetaParams = {
  value?: number
  currency?: string
  content_ids?: string[]
  content_type?: string
  content_name?: string
  num_items?: number
  payment_method?: string
}

const STANDARD = new Set(['PageView', 'CompleteRegistration', 'ViewContent', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase'])

export function trackMeta(name: string, eventId?: string, params: MetaParams = {}): boolean {
  if (typeof window === 'undefined') return false
  const fbq = (window as Window & { fbq?: Fbq }).fbq
  if (!fbq) return false
  const method = STANDARD.has(name) ? 'track' : 'trackCustom'
  if (eventId) fbq(method, name, params, { eventID: eventId })
  else if (Object.keys(params).length > 0) fbq(method, name, params)
  else fbq(method, name)
  return true
}

export function orderParams(input: { amountCents: number; productCode: string; durationDays: number; method?: 'PIX' | 'CARD' }): MetaParams {
  return {
    value: input.amountCents / 100,
    currency: 'BRL',
    content_ids: [input.productCode],
    content_type: 'product',
    content_name: `${input.productCode} ${input.durationDays} dias`,
    num_items: 1,
    ...(input.method ? { payment_method: input.method === 'PIX' ? 'pix' : 'card' } : {}),
  }
}
