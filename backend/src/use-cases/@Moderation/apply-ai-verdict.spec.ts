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

it('zero dispensa a IA; valores positivos mantêm o parecer e a confiança', () => {
  expect(applyAiVerdict(null, 0)).toBe('PUBLISH')
  expect(applyAiVerdict({ pass: false, confidence: 0, reasons: ['Recusado'] }, 0)).toBe('PUBLISH')
  expect(applyAiVerdict({ pass: true, confidence: 0.85, reasons: [] }, 0.85)).toBe('PUBLISH')
  expect(applyAiVerdict({ pass: false, confidence: 1, reasons: [] }, 0.01)).toBe('ADMIN')
  for (const threshold of [-1, 1.01, NaN, Infinity]) expect(applyAiVerdict(null, threshold)).toBe('ADMIN')
  for (const confidence of [NaN, -1, 1.01]) expect(applyAiVerdict({ pass: true, confidence, reasons: [] }, 0.5)).toBe('ADMIN')
})
