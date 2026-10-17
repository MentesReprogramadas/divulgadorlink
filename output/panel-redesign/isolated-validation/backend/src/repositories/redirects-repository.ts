import { queueContentReview } from '@/use-cases/@Notifications/content-review-events'
import { ContentReviewRequired, reviewSummary } from '@/domain/moderation/content-review'
import { createHash, randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import type { DestinationInput } from '@/domain/redirects/redirect-input'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { analyticsDay } from '@/domain/analytics/day'
import { RedirectError, validateRedirectDestination } from '@/use-cases/@Redirects/validate-destination'
import { validateRedirectContent } from '@/use-cases/@Redirects/validate-content'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'

export type RedirectActor = { tenantId: string; ownerId: string }
const revisionSelect = { review: { select: { id: true, status: true, reason: true, appealedAt: true, version: true } }, id: true, number: true, label: true, destinationUrl: true, requiresAge: true, status: true, errorMessage: true, createdAt: true, resolvedAt: true }
const fingerprint = (input: DestinationInput) => createHash('sha256').update(JSON.stringify([input.destinationUrl, input.label, input.requiresAge])).digest('hex')
async function owner(db: Prisma.TransactionClient, actor: RedirectActor, publish = false) {
  const user = await db.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId }, include: { identifiers: true } })
  if (!user || user.status !== 'ACTIVE' || (publish && !canSubmitLinkFromIdentifiers(user.status, user.identifiers))) throw new RedirectError(403, 'Confirme seu e-mail e verifique o estado da conta antes de alterar convites.')
  return user
}
async function lockOwner(db: Prisma.TransactionClient, actor: RedirectActor) {
  await db.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
  await owner(db, actor, true)
}
async function owned(db: Prisma.TransactionClient, actor: RedirectActor, id: string) {
  const row = await db.redirectHandle.findFirst({ where: { id, tenantId: actor.tenantId, ownerId: actor.ownerId } })
  if (!row) throw new RedirectError(404, 'Link permanente não encontrado.')
  return row
}
/** Keep current publication even when old; at most 49 other snapshots when it exists. */
async function prune(db: Prisma.TransactionClient, handleId: string, now: Date) {
  const handle = await db.redirectHandle.findUnique({ where: { id: handleId } })
  if (!handle) return
  const cutoff = new Date(now.getTime() - 180 * 86400000)
  const keep = await db.redirectDestination.findMany({ where: { handleId, createdAt: { gte: cutoff }, ...(handle.activeRevisionId ? { id: { not: handle.activeRevisionId } } : {}) }, orderBy: { number: 'desc' }, take: handle.activeRevisionId ? 49 : 50, select: { id: true } })
  const ids = [...keep.map(r => r.id), ...(handle.activeRevisionId ? [handle.activeRevisionId] : [])]
  await db.redirectDestination.deleteMany({ where: { handleId, id: { notIn: ids } } })
  await db.redirectDaily.deleteMany({ where: { revision: { handleId }, day: { lt: new Date(analyticsDay(cutoff) + 'T00:00:00Z') } } })
}
export async function purgeRedirectHistory(db: PrismaClient, now = new Date()) {
  let cursor: string | undefined
  for (;;) {
    const rows = await db.redirectHandle.findMany({ where: cursor ? { id: { gt: cursor } } : {}, orderBy: { id: 'asc' }, take: 100, select: { id: true } })
    if (!rows.length) return
    for (const row of rows) await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM redirect_handles WHERE id=${row.id} FOR UPDATE`
      await prune(tx, row.id, now)
    })
    cursor = rows.at(-1)!.id
  }
}
export async function listRedirects(db: PrismaClient, actor: RedirectActor, cursor?: string) {
  await owner(db, actor)
  const rows = await db.redirectHandle.findMany({ where: { tenantId: actor.tenantId, ownerId: actor.ownerId, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: 26, select: { id: true, version: true, activeRevisionId: true, disabled: true, revisions: { where: { createdAt: { gte: new Date(Date.now() - 180 * 86400000) } }, orderBy: { number: 'desc' }, take: 1, select: revisionSelect } } })
  const published = await db.redirectDestination.findMany({ where: { id: { in: rows.flatMap(row => row.activeRevisionId ? [row.activeRevisionId] : []) }, tenantId: actor.tenantId, handle: { ownerId: actor.ownerId }, status: 'APPROVED' }, select: revisionSelect })
  return { items: rows.slice(0, 25).map(({ revisions, ...r }) => ({ ...r, latest: (() => { const latest = revisions[0] ?? published.find(p => p.id === r.activeRevisionId); return latest ? { ...latest, review: reviewSummary(latest.review) } : null })(), stablePath: '/r/' + r.id })), nextCursor: rows.length > 25 ? rows[24]!.id : null }
}
export async function readRedirect(db: PrismaClient, actor: RedirectActor, id: string, range?: { from?: string; to?: string }, now = new Date()) {
  return db.$transaction(async tx => {
    await owner(tx, actor)
    await tx.$queryRaw`SELECT id FROM redirect_handles WHERE id=${id} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    const row = await owned(tx, actor, id); await prune(tx, id, now)
    const revisions = await tx.redirectDestination.findMany({ where: { handleId: id }, orderBy: { number: 'desc' }, select: { ...revisionSelect, accesses: { where: { day: { ...(range?.from ? { gte: new Date(range.from + 'T00:00:00Z') } : {}), ...(range?.to ? { lte: new Date(range.to + 'T00:00:00Z') } : {}) } }, orderBy: { day: 'asc' }, select: { day: true, accesses: true } } } })
    return { id: row.id, stablePath: '/r/' + row.id, version: row.version, activeRevisionId: row.activeRevisionId, disabled: row.disabled, revisions: revisions.map(revision => ({ ...revision, review: reviewSummary(revision.review) })) }
  })
}
export async function changeRedirect(db: PrismaClient, actor: RedirectActor, id: string | null, input: DestinationInput, ports: PublicContentValidationPorts, now = new Date()) {
  const hash = fingerprint(input)
  const pending = await db.$transaction(async tx => {
    await lockOwner(tx, actor)
    let handle = id ? await owned(tx, actor, id) : await tx.redirectHandle.findUnique({ where: { tenantId_ownerId_creationKey: { tenantId: actor.tenantId, ownerId: actor.ownerId, creationKey: input.requestKey } } })
    if (!handle) handle = await tx.redirectHandle.create({ data: { tenantId: actor.tenantId, ownerId: actor.ownerId, id: randomUUID(), creationKey: input.requestKey, creationHash: hash } })
    if (handle.disabled) throw new RedirectError(409, 'Este endereço foi desativado definitivamente.')
    if (!id && handle.creationHash !== hash) throw new RedirectError(409, 'Essa chave já foi usada para outro convite. Inicie uma nova criação.')
    const previous = await tx.redirectDestination.findUnique({ where: { handleId_requestKey: { handleId: handle.id, requestKey: input.requestKey } } })
    if (previous) {
      if (previous.requestHash !== hash) throw new RedirectError(409, 'Essa chave já foi usada para outro destino. Atualize os dados antes de enviar.')
      return { handle, revision: previous }
    }
    if (handle.version !== input.expectedRevision) throw new RedirectError(409, 'O convite mudou em outra aba. Atualize os dados antes de enviar.')
    await tx.contentReview.updateMany({ where: { redirectRevision: { handleId: handle.id }, status: { in: ['PENDING', 'REJECTED'] } }, data: { status: 'SUPERSEDED', resolvedAt: now } })
    await tx.redirectDestination.updateMany({ where: { handleId: handle.id, status: 'PENDING_REVIEW' }, data: { status: 'SUPERSEDED', resolvedAt: now } })
    const revision = await tx.redirectDestination.create({ data: { handleId: handle.id, tenantId: actor.tenantId, number: handle.version + 1, requestKey: input.requestKey, requestHash: hash, label: input.label, destinationUrl: input.destinationUrl, requiresAge: input.requiresAge, status: 'PENDING', createdAt: now } })
    handle = await tx.redirectHandle.update({ where: { id: handle.id }, data: { version: revision.number } })
    await prune(tx, handle.id, now)
    return { handle, revision }
  })
  const result = (status: string) => ({ id: pending.handle.id, stablePath: '/r/' + pending.handle.id, version: pending.revision.number, destinationRevision: { id: pending.revision.id, status } })
  if (pending.revision.status !== 'PENDING') {
    if (['BLOCKED', 'FAILED'].includes(pending.revision.status)) throw new RedirectError(pending.revision.status === 'FAILED' ? 503 : 422, pending.revision.errorMessage ?? 'Corrija o destino e envie novamente.', { id: pending.handle.id, version: pending.handle.version })
    return result(pending.revision.status)
  }
  let destination = '', failure: RedirectError | null = null, needsReview = false
  try { destination = await validateRedirectContent(db, actor.tenantId, input, ports) }
  catch (e) { if (e instanceof ContentReviewRequired) needsReview = true; else failure = e instanceof RedirectError ? e : new RedirectError(503, 'Validação indisponível. O destino anterior foi mantido.') }
  const final = await db.$transaction(async tx => {
    await lockOwner(tx, actor)
    const handle = await owned(tx, actor, pending.handle.id)
    const revision = await tx.redirectDestination.findUnique({ where: { id: pending.revision.id } })
    if (!revision) throw new RedirectError(409, 'Essa tentativa expirou. Atualize os dados antes de reenviar.')
    if (revision.status !== 'PENDING') return { status: revision.status, errorMessage: revision.errorMessage }
    if (handle.version !== revision.number || handle.disabled) {
      await tx.redirectDestination.update({ where: { id: revision.id }, data: { status: 'SUPERSEDED', resolvedAt: now } })
      return { status: 'SUPERSEDED', errorMessage: null }
    }
    if (needsReview) {
      await tx.redirectDestination.update({ where: { id: revision.id }, data: { status: 'PENDING_REVIEW' } })
      const review = await tx.contentReview.create({ data: { tenantId: actor.tenantId, ownerId: actor.ownerId, kind: 'REDIRECT', redirectRevisionId: revision.id, version: revision.number, snapshot: input } })
      await queueContentReview(tx, review.id)
      await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'content.review.submitted', entityType: 'ContentReview', entityId: review.id, after: { kind: 'REDIRECT', version: revision.number } } })
      return { status: 'PENDING_REVIEW', errorMessage: null }
    }
    const status = failure ? failure.status === 422 ? 'BLOCKED' : 'FAILED' : 'APPROVED'
    await tx.redirectDestination.update({ where: { id: revision.id }, data: { status, ...(failure ? { errorMessage: failure.message } : { destinationUrl: destination }), resolvedAt: now } })
    if (!failure) await tx.redirectHandle.update({ where: { id: handle.id }, data: { activeRevisionId: revision.id } })
    await prune(tx, handle.id, now)
    return { status, errorMessage: failure?.message ?? null }
  })
  if (final.status === 'SUPERSEDED') throw new RedirectError(409, 'Outra alteração substituiu essa tentativa. Atualize os dados.')
  if (['BLOCKED', 'FAILED'].includes(final.status)) throw new RedirectError(final.status === 'FAILED' ? 503 : 422, final.errorMessage ?? 'Corrija o destino e envie novamente.', { id: pending.handle.id, version: pending.revision.number })
  return result(final.status)
}
export async function disableRedirect(db: PrismaClient, actor: RedirectActor, id: string, expectedRevision: number) {
  return db.$transaction(async tx => {
    await lockOwner(tx, actor); const row = await owned(tx, actor, id)
    if (row.disabled) return { disabled: true }
    if (row.version !== expectedRevision) throw new RedirectError(409, 'O convite mudou. Atualize os dados.')
    await tx.redirectHandle.update({ where: { id }, data: { disabled: true, version: { increment: 1 } } })
    await tx.contentReview.updateMany({ where: { redirectRevision: { handleId: id }, status: { in: ['PENDING', 'REJECTED'] } }, data: { status: 'SUPERSEDED', resolvedAt: new Date() } })
    await tx.redirectDestination.updateMany({ where: { handleId: id, status: 'PENDING_REVIEW' }, data: { status: 'SUPERSEDED', resolvedAt: new Date() } })
    return { disabled: true }
  })
}
export async function resolveRedirect(db: PrismaClient, tenantId: string, id: string, age: boolean, ports: PublicContentValidationPorts, viewerId: string | null, now = new Date(), countAccess = true) {
  const unavailable = { available: false as const }
  const row = await db.redirectHandle.findFirst({ where: { id, tenantId, disabled: false, owner: { tenantId, status: 'ACTIVE' } } })
  if (!row?.activeRevisionId) return unavailable
  const revision = await db.redirectDestination.findFirst({ where: { id: row.activeRevisionId, handleId: id, tenantId, status: 'APPROVED' } })
  if (!revision) return unavailable
  if (revision.requiresAge && !age) return { restricted: true as const }
  try { await validateRedirectDestination(revision.destinationUrl, ports.probe) } catch { return unavailable }
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM redirect_handles WHERE id=${id} AND "tenantId"=${tenantId} FOR UPDATE`
    const current = await tx.redirectHandle.findFirst({ where: { id, tenantId, disabled: false, activeRevisionId: revision.id, owner: { status: 'ACTIVE', tenantId } } })
    if (!current) return unavailable
    const [terms, banned] = await Promise.all([tx.blocklistTerm.findMany({ where: { tenantId }, select: { term: true } }), tx.link.findMany({ where: { tenantId, owner: { tenantId, status: 'BANNED' } }, select: { canonicalUrl: true } })])
    if (hitsBlocklist({ text: revision.label, selectedNiche: '', nicheNames: [], terms: terms.map(t => t.term) }) || banned.some(l => canonicalUrl(l.canonicalUrl) === revision.destinationUrl)) return unavailable
    const viewer = viewerId ? await tx.user.findFirst({ where: { id: viewerId, tenantId, status: 'ACTIVE' }, select: { id: true, role: true } }) : null
    if (countAccess && (!viewer || (viewer.id !== row.ownerId && viewer.role !== 'ADMIN'))) {
      const day = new Date(analyticsDay(now) + 'T00:00:00Z')
      await tx.redirectDaily.upsert({ where: { revisionId_day: { revisionId: revision.id, day } }, create: { revisionId: revision.id, day, accesses: 1 }, update: { accesses: { increment: 1 } } })
    }
    return { available: true as const, destinationUrl: revision.destinationUrl }
  })
}
