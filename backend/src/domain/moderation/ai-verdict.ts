type ModelVerdict = { pass: boolean; confidence: number; reasons: string[] } | null

export function applyAiVerdict(verdict: ModelVerdict, threshold: number): 'PUBLISH' | 'ADMIN' {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) return 'ADMIN'
  if (threshold === 0) return 'PUBLISH'
  if (!verdict || verdict.pass !== true || !Number.isFinite(verdict.confidence) || verdict.confidence < 0 || verdict.confidence > 1 || verdict.confidence < threshold) return 'ADMIN'
  return 'PUBLISH'
}

export function explainAiVerdict(verdict: ModelVerdict, threshold: number | null): string {
  if (threshold === null || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) return 'Configuração de aprovação ausente ou inválida. Encaminhado para revisão humana.'
  if (threshold === 0) return 'Aprovado porque o limiar está em 0%. A análise da IA está desativada.'
  if (!verdict) return 'A IA não retornou uma avaliação válida. Encaminhado para revisão humana.'
  if (!verdict.pass) return 'A IA não aprovou o conteúdo. Encaminhado para revisão humana.'
  if (applyAiVerdict(verdict, threshold) !== 'PUBLISH') return 'A confiança da IA não atingiu o limiar ou é inválida. Encaminhado para revisão humana.'
  return 'A IA aprovou o conteúdo e a confiança atingiu o limiar configurado.'
}
