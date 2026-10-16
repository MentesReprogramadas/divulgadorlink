import { safeText } from './evolution-command'

export type AiApprovalEvidence = { verdict: { pass: boolean; confidence: number; reasons: string[] }; threshold: number }

export function aiApprovalSnapshot({ verdict, threshold }: AiApprovalEvidence) {
  return {
    confidence: verdict.confidence,
    threshold,
    reasons: verdict.reasons.map(reason => safeText(reason, 240)).filter(Boolean).slice(0, 5),
  }
}
