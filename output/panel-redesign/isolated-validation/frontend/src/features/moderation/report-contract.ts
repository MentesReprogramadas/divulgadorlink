export const REPORT_REASONS = {
  EXPIRED_INVITE: 'Convite expirado',
  UNAVAILABLE_DESTINATION: 'Destino indisponível',
  SPAM: 'Spam',
  INAPPROPRIATE_CONTENT: 'Conteúdo incompatível',
} as const
export type ReportReason = keyof typeof REPORT_REASONS
export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED'
export const REPORT_STATUS: Record<ReportStatus, string> = { RECEIVED: 'Recebida', IN_REVIEW: 'Em análise', RESOLVED: 'Resolvida' }
export type ReportReceipt = { id: string; status: ReportStatus; createdAt: string }
export type ReportFormProps = { name: string; onSubmit: (input: { reason: ReportReason; comment: string }) => Promise<ReportReceipt> }
export type ReportQueueRow = ReportReceipt & { linkId: string; reason: ReportReason; kind: 'CONTENT' | 'AVAILABILITY'; comment: string; version: number; decisionReason: string | null; updatedAt: string; link: { name: string; status: string }; history: Array<{ id: string; action: string; after: { status?: ReportStatus; reason?: string }; createdAt: string }> }
export type ReportQueueFilters = { status?: string; kind?: string; cursor?: string }
