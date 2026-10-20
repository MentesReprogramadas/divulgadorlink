import type { ContentReview } from '@/features/content-review/review-contract'
export type RedirectFieldsValue = { label: string; destinationUrl: string; requiresAge: boolean }
export type DestinationRevision = RedirectFieldsValue & { id: string; number: number; status: 'PENDING' | 'PENDING_REVIEW' | 'REJECTED' | 'APPROVED' | 'BLOCKED' | 'FAILED' | 'SUPERSEDED'; review?: ContentReview | null; errorMessage: string | null; createdAt: string; resolvedAt: string | null; accesses: Array<{ day: string; accesses: number }> }
export type RedirectSummary = { id: string; stablePath: string; version: number; activeRevisionId: string | null; disabled: boolean; poolEnabled?:boolean; active?:DestinationRevision|null; latest: DestinationRevision | null }
export type RedirectPage = { items: RedirectSummary[]; nextCursor: string | null }
export type RedirectDetail = Omit<RedirectSummary, 'latest'> & { revisions: DestinationRevision[] }
export const emptyRedirect = (): RedirectFieldsValue => ({ label: '', destinationUrl: '', requiresAge: false })
export const revisionStatus: Record<DestinationRevision['status'], string> = { PENDING: 'Em validação', PENDING_REVIEW: 'Em revisão humana', REJECTED: 'Recusado', APPROVED: 'Validado', BLOCKED: 'Correção necessária', FAILED: 'Validação indisponível', SUPERSEDED: 'Substituído por outra tentativa' }
