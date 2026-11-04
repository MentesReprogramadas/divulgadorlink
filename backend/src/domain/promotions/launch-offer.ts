import type { PriceRow } from './price-for'
export const LAUNCH_DISCOUNT_PERCENT = 20 as const
export const LAUNCH_VALIDITY_MS = 24 * 60 * 60 * 1000
export const LAUNCH_COOLDOWN_MS = 30 * LAUNCH_VALIDITY_MS
export type LaunchPriceRow = PriceRow & { referenceAmountCents: number }
export function discountedLaunchRows(rows: PriceRow[]): LaunchPriceRow[] {
 return rows.map(row => ({ ...row, referenceAmountCents: row.amountCents, amountCents: Math.round(row.amountCents * 80 / 100) }))
}
export function canIssueLaunchOffer(now: Date, linkCreatedAt: Date, previousCreatedAt: Date | null, source: 'post_create' | 'exit' = 'post_create'): boolean {
 const age = now.getTime() - linkCreatedAt.getTime()
 return age >= 0 && (source === 'exit' || age <= LAUNCH_VALIDITY_MS) && (!previousCreatedAt || now.getTime() - previousCreatedAt.getTime() >= LAUNCH_COOLDOWN_MS)
}
export function launchOfferIsActive(offer: { expiresAt: Date }, now: Date): boolean { return offer.expiresAt.getTime() > now.getTime() }
