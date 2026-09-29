const DAY_MS = 24 * 60 * 60 * 1000

export function renew(input: {
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  activatedAt: Date
  expiresAt: Date
  durationDays: number
}): { activatedAt: Date; expiresAt: Date; createdNewPromotion: false } {
  if (input.status !== 'ACTIVE') throw new Error('expirada')
  return {
    activatedAt: input.activatedAt,
    expiresAt: new Date(input.expiresAt.getTime() + input.durationDays * DAY_MS),
    createdNewPromotion: false,
  }
}
