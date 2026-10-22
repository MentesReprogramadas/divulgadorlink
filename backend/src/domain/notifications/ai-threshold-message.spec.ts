import type { Prisma } from '@prisma/client'
import { expect, it } from 'vitest'
import { renderOperationalMessage } from '@/use-cases/@Notifications/evolution-operations'
import { aiApprovalSnapshot } from './ai-approval'
import { explainAiVerdict } from '../moderation/ai-verdict'
it('WhatsApp explica aprovação, baixa confiança, parecer negativo, falha e dispensa em zero', () => {
  const render = (kind: string, payload: Prisma.JsonObject) => renderOperationalMessage({ id: 'notice', kind, payload }, 'secret', 'https://tenant.test')
  const approved = render('AI_APPROVED', aiApprovalSnapshot({ verdict: { pass: true, confidence: 0.9, reasons: ['Texto permitido'] }, threshold: 0.85 }))
  expect(approved).toContain('Texto permitido'); expect(approved).toContain('90%'); expect(approved).toContain('85%')
  for (const verdict of [null, { pass: false, confidence: 0.99, reasons: ['Fora das regras'] }, { pass: true, confidence: 0.4, reasons: ['Pouca informação'] }]) {
    const text = render('AI_REVIEWED', { ...aiApprovalSnapshot({ verdict, threshold: 0.85 }), decisionReason: explainAiVerdict(verdict, 0.85) })
    expect(text).toContain('Encaminhado para revisão humana. Não é uma recusa definitiva.')
    expect(text).toContain(explainAiVerdict(verdict, 0.85))
    expect(text).not.toContain('Link publicado.')
    expect(text).not.toContain('Responda:')
  }
  const zero = render('AI_APPROVED', aiApprovalSnapshot({ verdict: null, threshold: 0 }))
  expect(zero).toContain('APROVADO POR CONFIGURAÇÃO')
  expect(zero).toContain('análise da IA desativada')
  expect(zero).not.toContain('APROVADO PELA IA')
})
