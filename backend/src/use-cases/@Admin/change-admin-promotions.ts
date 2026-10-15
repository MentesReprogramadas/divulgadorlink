import type { Prisma, PromotionSurface } from '@prisma/client'
import type { AuditLogsRepository } from '@/repositories/audit-logs-repository'

export class AdminPromotionError extends Error {}

export async function changeAdminPromotions(tx: Prisma.TransactionClient, input: {
  tenantId: string; actorId: string; linkId: string; surfaces: PromotionSurface[]; expiresAt: Date | null; requestId: string
}, audit: AuditLogsRepository) {
  const actors = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM users WHERE id = ${input.actorId} AND "tenantId" = ${input.tenantId} AND role = 'ADMIN' AND status = 'ACTIVE' FOR SHARE`
  if (!actors.length) throw new AdminPromotionError('Acesso negado.')
  const candidate = await tx.link.findFirst({ where: { id: input.linkId, tenantId: input.tenantId }, select: { ownerId: true } })
  // Lock the owner before the link, matching account suspension's lock order.
  if (input.surfaces.length && candidate?.ownerId) await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.ownerId} FOR SHARE`
  // The link lock serializes this action with checkout creation and withdrawal.
  await tx.$queryRaw`SELECT id FROM links WHERE id = ${input.linkId} AND "tenantId" = ${input.tenantId} FOR UPDATE`
  const link = await tx.link.findFirst({ where: { id: input.linkId, tenantId: input.tenantId }, include: { owner: true, niche: true, network: true } })
  if (!link) throw new AdminPromotionError('Link não encontrado.')
  if (input.surfaces.length) {
    const owner = link.ownerId ? await tx.user.findUnique({ where: { id: link.ownerId } }) : null
    if (link.status !== 'PUBLISHED' || (link.ownerId && (owner?.status !== 'ACTIVE' || owner.tenantId !== input.tenantId))) throw new AdminPromotionError('Somente links publicados de contas ativas podem receber destaque.')
    if (input.surfaces.includes('HOME') && (link.niche.requiresAge || link.network.requiresAge)) throw new AdminPromotionError('Conteúdo com restrição de idade não pode receber destaque na página inicial.')
    if (input.expiresAt && input.expiresAt <= new Date()) throw new AdminPromotionError('O término precisa estar no futuro.')
  }
  const before = await tx.promotion.findMany({ where: { tenantId: input.tenantId, linkId: input.linkId, status: 'ACTIVE', administrative: true } })
  const paid = await tx.promotion.count({ where: { tenantId: input.tenantId, linkId: input.linkId, status: 'ACTIVE', administrative: false, surface: { in: input.surfaces } } })
  const pending = await tx.orderSurface.count({ where: { linkId: input.linkId, hold: 'PENDING_PAYMENT', surface: { in: input.surfaces } } })
  if (paid || pending) throw new AdminPromotionError('Há um destaque pago ou pagamento pendente neste local.')
  await tx.promotion.updateMany({ where: { tenantId: input.tenantId, linkId: input.linkId, status: 'ACTIVE', administrative: true }, data: { status: 'CANCELLED' } })
  for (const surface of input.surfaces) {
    const previous = before.find(row => row.surface === surface && (!row.expiresAt || row.expiresAt > new Date()))
    await tx.promotion.create({ data: { tenantId: input.tenantId, linkId: input.linkId, administrative: true, status: 'ACTIVE', surface, activatedAt: previous?.activatedAt ?? new Date(), expiresAt: input.expiresAt } })
  }
  await audit.create({ tenantId: input.tenantId, actorId: input.actorId, action: 'promotion.admin.update', entityType: 'Link', entityId: input.linkId, before, after: { surfaces: input.surfaces, expiresAt: input.expiresAt?.toISOString() ?? null }, requestId: input.requestId })
}
