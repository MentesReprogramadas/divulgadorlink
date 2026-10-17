/** Same fallback as catalogue submissions: a non-approved AI verdict needs a human. */
export class ContentReviewRequired extends Error {
  constructor() { super('Conteúdo enviado para revisão humana.') }
}
export const reviewSummary = (row: { id: string; status: string; reason: string | null; appealedAt: Date | null; version: number } | null | undefined) => row ? ({ id: row.id, status: row.status, reason: row.reason, version: row.version, canAppeal: row.status === 'REJECTED' && !row.appealedAt }) : null
