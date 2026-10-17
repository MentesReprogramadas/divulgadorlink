import { describe, expect, it } from 'vitest'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'

describe('veredito', () => {
  it('só publica com pass e confiança no limiar recebido', () => {
    const threshold = 0.8
    expect(applyAiVerdict({ pass: true, confidence: 0.9, reasons: [] }, threshold)).toBe('PUBLISH')
    expect(applyAiVerdict({ pass: true, confidence: 0.5, reasons: [] }, threshold)).toBe('ADMIN')
    expect(applyAiVerdict({ pass: false, confidence: 0.99, reasons: ['dúvida'] }, threshold)).toBe('ADMIN')
    expect(applyAiVerdict(null, threshold)).toBe('ADMIN')
  })
})
