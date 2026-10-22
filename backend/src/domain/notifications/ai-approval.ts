import { explainAiVerdict } from '@/domain/moderation/ai-verdict'
import { safeText } from './evolution-command'

export type AiApprovalEvidence = { verdict: { pass: boolean; confidence: number; reasons: string[] } | null; threshold: number }

export function aiApprovalSnapshot({ verdict, threshold }: AiApprovalEvidence) {
  return {
    confidence: verdict?.confidence ?? null,
    decisionReason: explainAiVerdict(verdict, threshold),
    threshold,
    reasons: (verdict?.reasons ?? []).map(reason => safeText(reason, 240)).filter(Boolean).slice(0, 5),
  }
}
