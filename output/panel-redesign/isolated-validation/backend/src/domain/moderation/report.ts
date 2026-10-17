export type ReportReason = 'EXPIRED_INVITE' | 'UNAVAILABLE_DESTINATION' | 'SPAM' | 'INAPPROPRIATE_CONTENT'
export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED'
export const REPORT_WINDOW_MS = 24 * 60 * 60 * 1000
export const REPORT_DAILY_LIMIT = 10
export class ReportError extends Error {
  constructor(readonly code: 'NOT_FOUND' | 'CONFLICT' | 'LIMITED' | 'INVALID') {
    super({ NOT_FOUND: 'Recurso não encontrado.', CONFLICT: 'A denúncia foi atualizada. Recarregue antes de decidir.', LIMITED: 'Limite de denúncias atingido. Tente novamente mais tarde.', INVALID: 'Revise o motivo e a justificativa.' }[code])
  }
}
const kinds = { EXPIRED_INVITE: 'AVAILABILITY', UNAVAILABLE_DESTINATION: 'AVAILABILITY', SPAM: 'CONTENT', INAPPROPRIATE_CONTENT: 'CONTENT' } as const
export function reportReason(value: string): ReportReason {
  if (!Object.hasOwn(kinds, value)) throw new ReportError('INVALID')
  return value as ReportReason
}
export function reportKind(reason: ReportReason): 'AVAILABILITY' | 'CONTENT' { return kinds[reportReason(reason)] }
export function intakeReport(existingAt: Date | null, recentCount: number, now: Date): 'CREATE' | 'DUPLICATE' | 'LIMITED' {
  if (existingAt && now.getTime() - existingAt.getTime() < REPORT_WINDOW_MS) return 'DUPLICATE'
  return recentCount >= REPORT_DAILY_LIMIT ? 'LIMITED' : 'CREATE'
}
export function decideReport(input: { status: ReportStatus; version: number; next: ReportStatus; expectedVersion: number; reason: string }): { status: ReportStatus; version: number; reason: string } {
  if (input.version !== input.expectedVersion || input.status === 'RESOLVED' || input.status === input.next || input.next === 'RECEIVED') throw new ReportError('CONFLICT')
  const reason = input.reason.trim()
  if (reason.length < 3 || reason.length > 500 || !['IN_REVIEW', 'RESOLVED'].includes(input.next)) throw new ReportError('INVALID')
  return { status: input.next, version: input.version + 1, reason }
}
