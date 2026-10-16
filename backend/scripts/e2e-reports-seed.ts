import type { PrismaClient } from '@prisma/client'
export async function seedReports(db: PrismaClient, input: { tenantId: string; ownerId: string; networkId: string; nicheId: string; adminId: string }) {
  const { adminId, ...linkData } = input
  const link = await db.link.create({ data: { ...linkData, id: 'f06-base-link', canonicalUrl: 'https://example.com/f06-fixture', name: 'Clube de leitura', description: 'Troca de livros e encontros de leitura', status: 'PUBLISHED', everPublished: true } })
  const at = new Date('2026-10-14T12:00:00Z')
  await db.linkReport.create({ data: { id: 'f06-visual-report', tenantId: input.tenantId, linkId: link.id, reporterKey: 'a'.repeat(64), reason: 'EXPIRED_INVITE', kind: 'AVAILABILITY', comment: 'O convite informa que expirou. O grupo continua ativo.', status: 'IN_REVIEW', version: 2, decisionReason: 'Verificando o convite com o responsável.', createdAt: at, updatedAt: at } })
  await db.auditLog.create({ data: { id: 'f06-visual-audit', tenantId: input.tenantId, actorId: adminId, entityType: 'LinkReport', entityId: 'f06-visual-report', action: 'report.decide', before: { status: 'RECEIVED', version: 1 }, after: { status: 'IN_REVIEW', version: 2, reason: 'Verificando o convite com o responsável.' }, createdAt: at } })
  await db.linkReport.create({ data: { id: 'f06-private-report', tenantId: input.tenantId, linkId: link.id, reporterKey: 'b'.repeat(64), reason: 'SPAM', kind: 'CONTENT', comment: 'PRIVATE_REPORT_SENTINEL', status: 'RESOLVED', version: 2, decisionReason: 'Relato analisado.', resolvedAt: at, createdAt: at, updatedAt: at } })
  return { baseLink: link.id }
}
