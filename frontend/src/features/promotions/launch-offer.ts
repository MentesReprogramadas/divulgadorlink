export type LaunchOffer = {
  id: string
  linkId: string
  linkName: string
  discountPercent: number
  expiresAt: string
  dismissed: boolean
  productCode?: string
  durationDays?: 7 | 14 | 28
}

export type LaunchOfferPrice = {
  durationDays: 7 | 14 | 28
  amountCents: number
  referenceAmountCents?: number
}

export function offerSecondsRemaining(expiresAt: string, now = Date.now()): number {
  const end = Date.parse(expiresAt)
  return Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / 1000)) : 0
}

export function offerClock(seconds: number): string {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':')
}
