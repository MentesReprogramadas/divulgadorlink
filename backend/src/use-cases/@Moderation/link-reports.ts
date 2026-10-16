import { ReportError, reportKind, reportReason, type ReportReason, type ReportStatus } from '@/domain/moderation/report'

export type ReportReceipt = { id: string; status: ReportStatus; createdAt: Date }
export type ReportSubmission = { tenantId: string; actorId: string; linkId: string; reason: ReportReason; kind: 'CONTENT' | 'AVAILABILITY'; comment: string; now: Date }
export type ReportDecision = { tenantId: string; actorId: string; reportId: string; status: ReportStatus; expectedVersion: number; reason: string; requestId: string; now: Date }
export type ReportQueueRow = ReportReceipt & { linkId: string; reason: string; kind: string; comment: string; version: number; decisionReason: string | null; updatedAt: Date; link: { name: string; status: string }; history: Array<{ id: string; action: string; after: unknown; createdAt: Date }> }
export type ReportQueueInput = { tenantId: string; actorId: string; status?: ReportStatus; kind?: 'CONTENT' | 'AVAILABILITY'; cursor?: string; limit: number }
export interface LinkReportsRepository {
  submit(input: ReportSubmission): Promise<ReportReceipt>
  list(input: ReportQueueInput): Promise<{ reports: ReportQueueRow[]; nextCursor: string | null }>
  decide(input: ReportDecision): Promise<{ report: ReportReceipt & { version: number }; auditId: string }>
}
export async function submitLinkReport(input: { tenantId: string; actorId: string; linkId: string; reason: string; comment?: string }, repository: LinkReportsRepository, now = new Date()) {
  const reason = reportReason(input.reason), comment = input.comment?.trim() ?? ''
  if (comment.length > 500) throw new ReportError('INVALID')
  return repository.submit({ ...input, reason, comment, kind: reportKind(reason), now })
}
