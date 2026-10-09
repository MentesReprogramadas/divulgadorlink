import { Prisma } from '@prisma/client'
import type { Touch } from '@/domain/acquisition/touch'
import { prisma } from '@/lib/prisma'

export type FunnelName = 'CompleteRegistration' | 'StartLinkSubmission' | 'SubmitLink' | 'LinkPublished'

export type FunnelInput = {
  tenantId: string
  eventId: string
  name: FunnelName
  userId: string | null
  linkId: string | null
  onInserted?: () => Promise<void>
}

export type StoredTouch = Touch & { tenantId: string; userId: string }

export function publishEventName(previous: string, next: string): 'LinkPublished' | null {
  if (previous === 'PUBLISHED') return null
  if (next !== 'PUBLISHED') return null
  return 'LinkPublished'
}

export function saoPauloDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function startEventId(userId: string, now = new Date()): string {
  return `${userId}:start:${saoPauloDay(now)}`
}

type AcquisitionStore = {
  rememberRegistration(input: { tenantId: string; userId: string; touch: Touch | null }): Promise<'inserted' | 'duplicate'>
  findTouch(userId: string): Promise<Touch | null>
  stampLink(linkId: string, touch: Touch | null): Promise<void>
  linkTouch(linkId: string): Touch | null
  recordFunnel(input: FunnelInput): Promise<'inserted' | 'duplicate'>
  events: FunnelInput[]
  touchFor(userId: string): StoredTouch | null
}

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export class MemoryAcquisitionStore implements AcquisitionStore {
  touches: StoredTouch[] = []
  links = new Map<string, Touch>()
  events: FunnelInput[] = []

  async rememberRegistration(input: { tenantId: string; userId: string; touch: Touch | null }): Promise<'inserted' | 'duplicate'> {
    if (input.touch && !this.touches.some((row) => row.userId === input.userId)) {
      this.touches.push({ ...input.touch, tenantId: input.tenantId, userId: input.userId })
    }
    return this.recordFunnel({
      tenantId: input.tenantId,
      eventId: input.userId,
      name: 'CompleteRegistration',
      userId: input.userId,
      linkId: null,
    })
  }

  async findTouch(userId: string): Promise<Touch | null> {
    const row = this.touchFor(userId)
    if (!row) return null
    return {
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      content: row.content,
      term: row.term,
      landingPath: row.landingPath,
    }
  }

  touchFor(userId: string): StoredTouch | null {
    return this.touches.find((row) => row.userId === userId) ?? null
  }

  async stampLink(linkId: string, touch: Touch | null): Promise<void> {
    if (!touch || this.links.has(linkId)) return
    this.links.set(linkId, touch)
  }

  linkTouch(linkId: string): Touch | null {
    return this.links.get(linkId) ?? null
  }

  async recordFunnel(input: FunnelInput): Promise<'inserted' | 'duplicate'> {
    if (this.events.some((row) => row.tenantId === input.tenantId && row.eventId === input.eventId)) {
      return 'duplicate'
    }
    this.events.push(input)
    if (input.onInserted) await input.onInserted()
    return 'inserted'
  }

  reset(): void {
    this.touches = []
    this.links.clear()
    this.events = []
  }
}

class PrismaAcquisitionStore implements AcquisitionStore {
  events: FunnelInput[] = []

  async rememberRegistration(input: { tenantId: string; userId: string; touch: Touch | null }): Promise<'inserted' | 'duplicate'> {
    if (input.touch) {
      const existing = await prisma.acquisitionTouch.findUnique({ where: { userId: input.userId } })
      if (!existing) {
        await prisma.acquisitionTouch.create({
          data: {
            tenantId: input.tenantId,
            userId: input.userId,
            source: input.touch.source,
            medium: input.touch.medium,
            campaign: input.touch.campaign,
            content: input.touch.content,
            term: input.touch.term,
            landingPath: input.touch.landingPath,
          },
        })
      }
    }
    return this.recordFunnel({
      tenantId: input.tenantId,
      eventId: input.userId,
      name: 'CompleteRegistration',
      userId: input.userId,
      linkId: null,
    })
  }

  async findTouch(userId: string): Promise<Touch | null> {
    const row = await prisma.acquisitionTouch.findUnique({ where: { userId } })
    if (!row) return null
    return {
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      content: row.content,
      term: row.term,
      landingPath: '/divulgar',
    }
  }

  touchFor(): StoredTouch | null {
    return null
  }

  async stampLink(linkId: string, touch: Touch | null): Promise<void> {
    if (!touch) return
    await prisma.link.update({
      where: { id: linkId },
      data: {
        acquisitionSource: touch.source,
        acquisitionMedium: touch.medium,
        acquisitionCampaign: touch.campaign,
        acquisitionContent: touch.content,
        acquisitionTerm: touch.term,
      },
    })
  }

  linkTouch(): Touch | null {
    return null
  }

  async recordFunnel(input: FunnelInput): Promise<'inserted' | 'duplicate'> {
    try {
      await prisma.funnelEvent.create({
        data: {
          tenantId: input.tenantId,
          eventId: input.eventId,
          name: input.name,
          userId: input.userId,
          linkId: input.linkId,
        },
      })
    } catch (error) {
      if (isUnique(error)) return 'duplicate'
      throw error
    }
    if (input.onInserted) await input.onInserted()
    else await notifyMeta({ name: input.name, eventId: input.eventId })
    return 'inserted'
  }
}

export async function notifyMeta(input: {
  name: string
  eventId: string
  token?: string
  pixelId?: string
  fetchImpl?: typeof fetch
}): Promise<void> {
  const token = input.token ?? process.env.META_CAPI_TOKEN
  const pixelId = input.pixelId ?? process.env.META_PIXEL_ID
  if (!token || !pixelId) return
  const fetchImpl = input.fetchImpl ?? fetch
  await fetchImpl(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: [{ event_name: input.name, event_id: input.eventId, action_source: 'website' }],
      access_token: token,
    }),
  })
}

const memory = new MemoryAcquisitionStore()
const persisted = new PrismaAcquisitionStore()

export function getAcquisitionStore(): AcquisitionStore {
  return process.env.NODE_ENV === 'test' ? memory : persisted
}

export function resetAcquisitionStoreForTest(): void {
  memory.reset()
}
