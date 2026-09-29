export function applyAiVerdict(
  verdict: { pass: boolean; confidence: number; reasons: string[] } | null,
  threshold: number,
): 'PUBLISH' | 'ADMIN' {
  if (!verdict || verdict.pass !== true || verdict.confidence < threshold) return 'ADMIN'
  return 'PUBLISH'
}
