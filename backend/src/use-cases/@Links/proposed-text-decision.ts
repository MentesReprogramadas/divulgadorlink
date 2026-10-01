import { editLinkText } from '@/use-cases/@Links/edit-link-text'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'

export type ModelVerdict = { pass: boolean; confidence: number; reasons: string[] } | null

export function decideProposedText(input: {
  publishedName: string
  proposedName: string
  blocklisted: boolean
  verdict: ModelVerdict
  threshold: number
}): { decision: 'PUBLISH' | 'ADMIN'; visibleName: string; provider: 'adapter' | 'unavailable' } {
  const decision = input.blocklisted ? 'ADMIN' : applyAiVerdict(input.verdict, input.threshold)
  const edited = editLinkText({
    publishedName: input.publishedName,
    nextName: input.proposedName,
    blocklisted: input.blocklisted,
    ai: decision,
  })
  return {
    decision,
    visibleName: edited.visibleName,
    provider: input.verdict ? 'adapter' : 'unavailable',
  }
}
