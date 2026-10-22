import { expect, it } from 'vitest'
import { explainAiVerdict } from './ai-verdict'
import { aiApprovalSnapshot } from '../notifications/ai-approval'
it('explica aprovação, dispensa, recusa, confiança e indisponibilidade sem inventar parecer', () => {
  expect(explainAiVerdict(null, 0)).toContain('desativada')
  expect(explainAiVerdict(null, null)).toContain('ausente ou inválida')
  expect(explainAiVerdict(null, 0.85)).toContain('não retornou')
  expect(explainAiVerdict({ pass: false, confidence: 0.99, reasons: [] }, 0.85)).toContain('não aprovou')
  expect(explainAiVerdict({ pass: true, confidence: 0.8, reasons: [] }, 0.85)).toContain('não atingiu')
  expect(explainAiVerdict({ pass: true, confidence: 0.85, reasons: [] }, 0.85)).toContain('atingiu o limiar')
  expect(aiApprovalSnapshot({ verdict: null, threshold: 0 })).toMatchObject({ confidence: null, threshold: 0, reasons: [], decisionReason: expect.stringContaining('desativada') })
})
