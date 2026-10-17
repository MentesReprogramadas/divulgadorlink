import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { observeAvailability, type MonitorPolicy } from '@/domain/links/availability-monitor'
import { remainingPaidMilliseconds } from '@/domain/promotions/paid-time'
import { assertCheckout } from '@/domain/promotions/eligibility'
import { hostMatchesNetwork } from '@/domain/links/network-host'
import { LINK_QUOTA, SLOT_STATUSES } from './links-repository'
import { PrismaAuditLogsRepository, type AuditLogsRepository } from './audit-logs-repository'
import { canSubmitLink, confirmationFlags } from '@/use-cases/@Auth/confirm-identifier'
import { AvailabilityError, type AvailabilityActor, type AvailabilityContext, type LinkAvailabilityRepository, type UrlDecisionInput } from '@/use-cases/@Links/link-availability'

type Tx = Prisma.TransactionClient
export type ProbeClaim = { linkId: string; tenantId: string; canonicalUrl: string; version: number; token: string }
async function actor(tx: Tx, context: AvailabilityActor, admin = false, verified = false) {
  await tx.$queryRaw`SELECT id FROM users WHERE id=${context.actorId} AND "tenantId"=${context.tenantId} FOR SHARE`
  const user = await tx.user.findFirst({ where: { id: context.actorId, tenantId: context.tenantId, status: 'ACTIVE' }, include: { identifiers: true } })
  if (!user || (admin && user.role !== 'ADMIN')) throw new AvailabilityError('NOT_FOUND')
  if (verified && !canSubmitLink({ status: user.status, ...confirmationFlags(user.identifiers) })) throw new AvailabilityError('CONFLICT', 'Confirme seu e-mail antes de enviar a correção.')
  return user
}
async function lockedLink(tx: Tx, tenantId: string, linkId: string) {
  await tx.$queryRaw`SELECT id FROM links WHERE id=${linkId} AND "tenantId"=${tenantId} FOR UPDATE`
  const configuration = await tx.$queryRaw<Array<{ id: string }>>`SELECT n.id FROM links l JOIN networks n ON n.id=l."networkId" JOIN niches c ON c.id=l."nicheId" WHERE l.id=${linkId} AND l."tenantId"=${tenantId} AND n."tenantId"=${tenantId} AND c."tenantId"=${tenantId} FOR SHARE OF n,c`
  if (!configuration.length) throw new AvailabilityError('NOT_FOUND')
  const link = await tx.link.findFirst({ where: { id: linkId, tenantId }, include: { availability: true, network: true, niche: true, owner: { include: { identifiers: true } } } })
  if (!link) throw new AvailabilityError('NOT_FOUND')
  return link
}
const historySelect = { id: true, canonicalUrl: true, expectedVersion: true, status: true, checkedAt: true, createdAt: true, decidedAt: true, decisionReason: true } as const

export class PrismaLinkAvailabilityRepository implements LinkAvailabilityRepository {
  constructor(private readonly db: PrismaClient, private readonly auditFor: (tx: Tx) => AuditLogsRepository = tx => new PrismaAuditLogsRepository(tx)) {}
  async read(input: AvailabilityContext) {
    return this.db.$transaction(async tx => {
      const user = await actor(tx, input)
      const link = await tx.link.findFirst({ where: { id: input.linkId, tenantId: input.tenantId, ...(user.role === 'ADMIN' ? {} : { ownerId: user.id }) }, include: { availability: true, urlRevisions: { select: historySelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20 }, promotions: { where: { status: 'PAUSED' }, select: { id: true, surface: true, pauses: { where: { endsAt: null }, select: { remainingMs: true, startsAt: true } } } } } })
      if (!link) throw new AvailabilityError('NOT_FOUND')
      const check = link.availability
      return { link: { id: link.id, name: link.name, canonicalUrl: link.canonicalUrl, status: link.status }, availability: { version: check?.version ?? 1, state: check?.state ?? 'UNKNOWN', checkedAt: check?.checkedAt ?? null, failures: check?.failures ?? 0, disabledAt: check?.disabledAt ?? null }, proposals: link.urlRevisions,
        pausedPromotions: link.promotions.map(p => ({ id: p.id, surface: p.surface, pausedAt: p.pauses[0]?.startsAt ?? null, remainingMs: p.pauses[0]?.remainingMs === null || p.pauses[0]?.remainingMs === undefined ? null : Number(p.pauses[0].remainingMs) })),
        canPropose: user.id === link.ownerId && link.status === 'UNAVAILABLE' && check?.disabledAt !== null && check?.disabledAt !== undefined && !link.urlRevisions.some(r => r.status === 'PENDING') }
    })
  }
  async proposalContext(input: AvailabilityContext) {
    return this.db.$transaction(async tx => {
      await actor(tx, input, false, true)
      const link = await lockedLink(tx, input.tenantId, input.linkId)
      if (link.ownerId !== input.actorId) throw new AvailabilityError('NOT_FOUND')
      if (link.status !== 'UNAVAILABLE' || !link.availability?.disabledAt) throw new AvailabilityError('CONFLICT', 'Este link não aguarda correção de disponibilidade.')
      return { canonicalUrl: link.canonicalUrl, version: link.availability.version, knownHosts: link.network.knownHosts }
    })
  }
  async propose(input: AvailabilityContext & { canonicalUrl: string; sourceUrl: string; expectedVersion: number; now: Date }) {
    return this.db.$transaction(async tx => {
      await actor(tx, input, false, true)
      const link = await lockedLink(tx, input.tenantId, input.linkId)
      if (link.ownerId !== input.actorId) throw new AvailabilityError('NOT_FOUND')
      const check = link.availability
      if (!check?.disabledAt || check.version !== input.expectedVersion || link.status !== 'UNAVAILABLE' || link.canonicalUrl !== input.sourceUrl) throw new AvailabilityError('CONFLICT')
      if (!hostMatchesNetwork(new URL(input.canonicalUrl).hostname, link.network.knownHosts)) throw new AvailabilityError('INVALID')
      const existing = await tx.urlRevision.findFirst({ where: { linkId: link.id, status: 'PENDING' } })
      if (existing) {
        if (existing.canonicalUrl === input.canonicalUrl) return { proposal: { id: existing.id, status: existing.status }, version: check.version }
        throw new AvailabilityError('CONFLICT', 'Uma correção já aguarda análise.')
      }
      const revision = await tx.urlRevision.create({ data: { tenantId: input.tenantId, linkId: link.id, canonicalUrl: input.canonicalUrl, sourceUrl: input.sourceUrl, expectedVersion: check.version, checkedAt: input.now, createdAt: input.now } })
      // Invalidates probes already in flight; candidates never reach the public projection.
      await tx.linkAvailability.update({ where: { linkId: link.id }, data: { version: { increment: 1 }, leaseToken: null, leaseUntil: null } })
      return { proposal: { id: revision.id, status: revision.status }, version: check.version + 1 }
    })
  }
  async pending(input: AvailabilityActor & { cursor?: string }) {
    return this.db.$transaction(async tx => {
      await actor(tx, input, true)
      if (input.cursor && !await tx.urlRevision.findFirst({ where: { id: input.cursor, tenantId: input.tenantId } })) throw new AvailabilityError('NOT_FOUND')
      const rows = await tx.urlRevision.findMany({ where: { tenantId: input.tenantId, status: 'PENDING' }, cursor: input.cursor ? { id: input.cursor } : undefined, skip: input.cursor ? 1 : 0, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 26, select: { ...historySelect, linkId: true, sourceUrl: true, link: { select: { name: true, status: true, availability: { select: { version: true } } } } } })
      const visible = rows.slice(0, 25)
      return { proposals: visible.map(({ link, ...row }) => ({ ...row, link: { name: link.name, status: link.status }, version: link.availability?.version ?? null })), nextCursor: rows.length > 25 ? visible.at(-1)!.id : null }
    })
  }
  async decisionContext(input: UrlDecisionInput) {
    return this.db.$transaction(async tx => {
      await actor(tx, input, true)
      const revision = await tx.urlRevision.findFirst({ where: { id: input.revisionId, tenantId: input.tenantId }, include: { link: { include: { network: true } } } })
      if (!revision) throw new AvailabilityError('NOT_FOUND')
      if (revision.status !== 'PENDING') throw new AvailabilityError('CONFLICT')
      return { canonicalUrl: revision.canonicalUrl, knownHosts: revision.link.network.knownHosts }
    })
  }
  async decide(input: UrlDecisionInput) {
    return this.db.$transaction(async tx => {
      await actor(tx, input, true)
      const revision = await tx.urlRevision.findFirst({ where: { id: input.revisionId, tenantId: input.tenantId } })
      if (!revision) throw new AvailabilityError('NOT_FOUND')
      const link = await lockedLink(tx, input.tenantId, revision.linkId)
      const check = link.availability
      if (revision.status !== 'PENDING' || !check?.disabledAt || check.version !== input.expectedVersion || link.canonicalUrl !== revision.sourceUrl || link.status !== 'UNAVAILABLE') throw new AvailabilityError('CONFLICT')
      if (input.decision === 'APPROVE') {
        if (!link.owner || !canSubmitLink({ status: link.owner.status, ...confirmationFlags(link.owner.identifiers) })) throw new AvailabilityError('CONFLICT', 'O responsável precisa ter uma conta ativa e verificada.')
        if (!hostMatchesNetwork(new URL(revision.canonicalUrl).hostname, link.network.knownHosts)) throw new AvailabilityError('INVALID')
        const paused = await tx.promotion.findMany({ where: { tenantId: input.tenantId, linkId: link.id, status: 'PAUSED' }, include: { pauses: { where: { endsAt: null } } } })
        for (const promotion of paused) {
          try { assertCheckout({ account: link.owner.status, link: 'PUBLISHED', requiresAge: link.niche.requiresAge, surfaces: [promotion.surface], activeSurfaces: [], pendingSurfaces: [] }) }
          catch { throw new AvailabilityError('CONFLICT', 'Revise a elegibilidade atual dos destaques antes de retomar. O saldo continua pausado.') }
        }
        // Same lock and serializable quota as submission, without granting an extra slot.
        const used = await tx.link.count({ where: { tenantId: input.tenantId, ownerId: link.ownerId, status: { in: SLOT_STATUSES }, occupiesSlot: true } })
        if (used >= LINK_QUOTA) throw new AvailabilityError('CONFLICT', 'Libere uma vaga de publicação antes de aprovar a correção. O saldo continua pausado.')
        const duplicate = await tx.link.findFirst({ where: { tenantId: input.tenantId, id: { not: link.id }, canonicalUrl: revision.canonicalUrl, occupiesSlot: true } })
        if (duplicate) throw new AvailabilityError('CONFLICT', 'Esse endereço já está no catálogo.')
        const banned = await tx.link.findFirst({ where: { tenantId: input.tenantId, canonicalUrl: revision.canonicalUrl, owner: { status: 'BANNED' } } })
        if (banned) throw new AvailabilityError('CONFLICT', 'O endereço não está elegível para publicação.')
        await tx.link.update({ where: { id: link.id }, data: { canonicalUrl: revision.canonicalUrl, status: 'PUBLISHED', occupiesSlot: true } })
        for (const promotion of paused) {
          const pause = promotion.pauses[0]
          if (!pause) throw new AvailabilityError('CONFLICT', 'Saldo pendente de conciliação.')
          await tx.promotionPause.update({ where: { id: pause.id }, data: { endsAt: input.now } })
          await tx.promotion.update({ where: { id: promotion.id }, data: { status: 'ACTIVE', expiresAt: pause.remainingMs === null ? null : new Date(input.now.getTime() + Number(pause.remainingMs)) } })
        }
      }
      const status = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      await tx.urlRevision.update({ where: { id: revision.id }, data: { status, decisionReason: input.reason, decidedAt: input.now, checkedAt: input.decision === 'APPROVE' ? input.now : revision.checkedAt } })
      await tx.linkAvailability.update({ where: { linkId: link.id }, data: { version: { increment: 1 }, leaseToken: null, leaseUntil: null, ...(input.decision === 'APPROVE' ? { disabledAt: null, state: 'ACCESSIBLE', failures: 0, checkedAt: input.now, lastStatus: 200, nextCheckAt: input.now, notificationPendingAt: null, notificationNextAt: null } : {}) } })
      const audit = await this.auditFor(tx).create({ tenantId: input.tenantId, actorId: input.actorId, action: 'link.url.decided', entityType: 'UrlRevision', entityId: revision.id, before: { canonicalUrl: link.canonicalUrl, status: link.status }, after: { status, reason: input.reason, canonicalUrl: input.decision === 'APPROVE' ? revision.canonicalUrl : link.canonicalUrl }, requestId: input.requestId })
      return { proposal: { id: revision.id, status }, auditId: audit.id }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
  }

  async initialize(now: Date): Promise<void> {
    const links = await this.db.link.findMany({ where: { status: 'PUBLISHED', owner: { status: 'ACTIVE' }, availability: null }, select: { id: true, tenantId: true }, orderBy: { id: 'asc' }, take: 100 })
    await this.db.linkAvailability.createMany({ data: links.map(link => ({ linkId: link.id, tenantId: link.tenantId, nextCheckAt: now })), skipDuplicates: true })
  }
  async due(now: Date) {
    return this.db.linkAvailability.findMany({ where: { nextCheckAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }], link: { owner: { status: 'ACTIVE' }, urlRevisions: { none: { status: 'PENDING' } }, OR: [{ status: 'PUBLISHED' }, { status: 'UNAVAILABLE', availability: { disabledAt: { not: null } } }] } }, orderBy: [{ nextCheckAt: 'asc' }, { linkId: 'asc' }], take: 50, select: { linkId: true, tenantId: true } })
  }
  async claim(tenantId: string, linkId: string, now: Date, policy: MonitorPolicy): Promise<ProbeClaim | null> {
    return this.db.$transaction(async tx => {
      const link = await lockedLink(tx, tenantId, linkId)
      const check = link.availability
      if (!check || check.nextCheckAt > now || (check.leaseUntil && check.leaseUntil > now) || !link.owner || link.owner.status !== 'ACTIVE' || (link.status !== 'PUBLISHED' && !(link.status === 'UNAVAILABLE' && check.disabledAt))) return null
      // A pending correction freezes its snapshot version until a human decision.
      if (await tx.urlRevision.findFirst({ where: { linkId, status: 'PENDING' }, select: { id: true } })) return null
      let host: string
      try { host = new URL(link.canonicalUrl).hostname.toLowerCase() } catch { return null }
      const hostClaim = await tx.$queryRaw<Array<{ host: string }>>`INSERT INTO availability_hosts (host,"nextCheckAt") VALUES (${host},${new Date(now.getTime() + policy.hostIntervalMs)}) ON CONFLICT (host) DO UPDATE SET "nextCheckAt"=EXCLUDED."nextCheckAt" WHERE availability_hosts."nextCheckAt"<=${now} RETURNING host`
      if (!hostClaim.length) {
        const throttle = await tx.availabilityHost.findUniqueOrThrow({ where: { host } })
        await tx.linkAvailability.update({ where: { linkId }, data: { nextCheckAt: throttle.nextCheckAt } })
        return null
      }
      const token = randomUUID()
      await tx.linkAvailability.update({ where: { linkId }, data: { leaseToken: token, leaseUntil: new Date(now.getTime() + 120000) } })
      return { tenantId, linkId, canonicalUrl: link.canonicalUrl, version: check.version, token }
    })
  }
  async observe(claim: ProbeClaim, status: number | null, now: Date, policy: MonitorPolicy): Promise<boolean> {
    return this.db.$transaction(async tx => {
      const link = await lockedLink(tx, claim.tenantId, claim.linkId)
      const check = link.availability
      if (!check || check.version !== claim.version || check.leaseToken !== claim.token || link.canonicalUrl !== claim.canonicalUrl || !check.leaseUntil || check.leaseUntil < now) return false
      if (!link.owner || link.owner.status !== 'ACTIVE' || (link.status !== 'PUBLISHED' && !(link.status === 'UNAVAILABLE' && check.disabledAt))) {
        await tx.linkAvailability.update({ where: { linkId: link.id }, data: { leaseToken: null, leaseUntil: null } })
        return false
      }
      const next = observeAvailability({ failures: check.failures, automaticallyUnavailable: check.disabledAt !== null }, status, now, policy)
      if (next.withdraw) {
        await tx.link.update({ where: { id: link.id }, data: { status: 'UNAVAILABLE', occupiesSlot: false } })
        const promotions = await tx.promotion.findMany({ where: { tenantId: claim.tenantId, linkId: link.id, status: 'ACTIVE', administrative: false } })
        for (const promotion of promotions) {
          const remaining = promotion.expiresAt === null ? null : remainingPaidMilliseconds(promotion.expiresAt, now)
          if (remaining === 0) { await tx.promotion.update({ where: { id: promotion.id }, data: { status: 'EXPIRED' } }); continue }
          await tx.promotionPause.create({ data: { tenantId: claim.tenantId, promotionId: promotion.id, revision: promotion.pauseRevision + 1, startsAt: now, remainingMs: remaining === null ? null : BigInt(remaining) } })
          await tx.promotion.update({ where: { id: promotion.id }, data: { status: 'PAUSED', pauseRevision: { increment: 1 } } })
        }
        await this.auditFor(tx).create({ tenantId: claim.tenantId, actorId: null, action: 'link.availability.withdrawn', entityType: 'link', entityId: link.id, before: { status: link.status }, after: { status: 'UNAVAILABLE', failures: next.failures }, requestId: null })
      }
      await tx.linkAvailability.update({ where: { linkId: link.id }, data: { version: { increment: 1 }, state: next.state, failures: next.failures, checkedAt: now, lastStatus: status, nextCheckAt: next.nextCheckAt, leaseToken: null, leaseUntil: null, ...(next.withdraw ? { disabledAt: now, notificationPendingAt: now, notificationSentAt: null, notificationNextAt: now, notificationAttempts: 0 } : {}) } })
      return true
    }, { timeout: 15000 })
  }
}

let repository: LinkAvailabilityRepository | null = null
export function getLinkAvailabilityRepository(): LinkAvailabilityRepository { return repository ?? new PrismaLinkAvailabilityRepository(prisma) }
export function setLinkAvailabilityRepositoryForTest(value: LinkAvailabilityRepository | null): void { if (process.env.NODE_ENV === 'test') repository = value }
