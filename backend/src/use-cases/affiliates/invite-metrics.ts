import type { PrismaClient } from '@prisma/client'

export type InviteEventKind = 'VIEW' | 'BUTTON_CLICK' | 'AUTOMATIC_REDIRECT' | 'BUTTON_REDIRECT'
const counters = { VIEW: 'views', BUTTON_CLICK: 'buttonClicks', AUTOMATIC_REDIRECT: 'automaticRedirects', BUTTON_REDIRECT: 'buttonRedirects' } as const

// The random event ID lives only in this page/request, never in visitor storage or a cookie.
export async function recordInviteEvent(db: PrismaClient, tenantId: string, segmentId: string, eventId: string, kind: InviteEventKind) {
  return db.$transaction(async tx => {
    const event = await tx.affiliateInviteEvent.createMany({ data: [{ tenantId, segmentId, eventId, kind }], skipDuplicates: true })
    if (!event.count) return false
    const counter = counters[kind]
    await tx.affiliateInviteMetrics.upsert({ where: { segmentId }, create: { tenantId, segmentId, [counter]: 1 }, update: { [counter]: { increment: 1 } } })
    return true
  })
}

export function purgeInviteEvents(db: PrismaClient, now = new Date()) {
  return db.affiliateInviteEvent.deleteMany({ where: { createdAt: { lt: new Date(+now - 48 * 60 * 60_000) } } })
}
