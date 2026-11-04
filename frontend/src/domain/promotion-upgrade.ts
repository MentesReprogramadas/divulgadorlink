export type PromotionSurface = 'SEARCH' | 'NICHE' | 'HOME'
export type UpgradeOffer = {
  code: string
  surfaces: readonly PromotionSurface[]
  prices: readonly { durationDays: number; amountCents: number }[]
}

// O catálogo já vem filtrado pelo servidor: nunca reconstruir Home para um link +18.
export function findPromotionUpgrade(current: UpgradeOffer | undefined, offers: readonly UpgradeOffer[], days: number) {
  const currentPrice = current?.prices.find(price => price.durationDays === days)?.amountCents
  if (!current || currentPrice === undefined) return null
  const candidates = offers.filter(offer => offer.surfaces.length > current.surfaces.length
    && current.surfaces.every(surface => offer.surfaces.includes(surface)))
    .sort((a, b) => b.surfaces.length - a.surfaces.length)
  for (const offer of candidates) {
    const totalCents = offer.prices.find(price => price.durationDays === days)?.amountCents
    if (totalCents === undefined || totalCents < currentPrice) continue
    return { offer, totalCents, additionalCents: totalCents - currentPrice,
      missingSurfaces: offer.surfaces.filter(surface => !current.surfaces.includes(surface)) }
  }
  return null
}
