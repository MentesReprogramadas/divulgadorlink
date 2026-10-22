import { describe, expect, it, vi } from 'vitest'
import { settleSubmission, type SubmissionSnapshot } from '@/use-cases/@Moderation/settle-submission'

const pending: SubmissionSnapshot = {
  status: 'PENDING_MODERATION',
  name: 'Grupo de receitas',
  description: 'Receitas da semana',
  nicheName: 'Culinária',
  tenantId: 'tenant',
}

describe('settleSubmission', () => {
  it('encaminha ao publicador a justificativa e o limiar usados na decisão', async () => {
    const verdict = { pass: true, confidence: 0.94, reasons: ['Nome e descrição compatíveis com culinária.'] }
    const publish = vi.fn(async () => undefined)
    await settleSubmission({ linkId: 'link-1', judge: async () => verdict, load: async () => pending, readThreshold: async () => 0.85, publish })
    expect(publish).toHaveBeenCalledWith('link-1', { verdict, threshold: 0.85 })
  })
  it('publica só quando o veredito passa do limiar', async () => {
    const published: string[] = []
    const decision = await settleSubmission({
      linkId: 'link-1',
      judge: async () => ({ pass: true, confidence: 0.9, reasons: [] }),
      load: async () => pending,
      readThreshold: async () => 0.85,
      publish: async (id) => { published.push(id) },
    })
    expect(decision).toBe('PUBLISH')
    expect(published).toEqual(['link-1'])
  })

  it('deixa na fila quando a confiança não chega, a chave falta ou o link já saiu da fila', async () => {
    const published: string[] = []
    const ports = {
      load: async () => pending,
      readThreshold: async () => 0.85,
      publish: async (id: string) => { published.push(id) },
    }
    expect(await settleSubmission({
      ...ports,
      linkId: 'baixo',
      judge: async () => ({ pass: true, confidence: 0.4, reasons: [] }),
    })).toBe('ADMIN')
    expect(await settleSubmission({ ...ports, linkId: 'sem-chave', judge: null })).toBe('ADMIN')
    expect(await settleSubmission({
      ...ports,
      linkId: 'feito',
      judge: async () => ({ pass: true, confidence: 1, reasons: [] }),
      load: async () => ({ ...pending, status: 'PUBLISHED' }),
    })).toBe('SKIPPED')
    expect(published).toEqual([])
  })

  it('repete a chamada se o provedor falha antes da última tentativa', async () => {
    await expect(settleSubmission({
      linkId: 'link-1',
      finalAttempt: false,
      judge: async () => { throw new Error('timeout') },
      load: async () => pending,
      readThreshold: async () => 0.85,
      publish: async () => undefined,
    })).rejects.toThrow('timeout')
  })
})

it('limiar zero publica sem chamar o modelo, sem atribuir parecer à IA', async () => {
  const judge = vi.fn(async () => { throw new Error('Não deve consultar o provedor') })
  const publish = vi.fn(async () => undefined)
  expect(await settleSubmission({ linkId: 'zero', judge, load: async () => pending, readThreshold: async () => 0, publish })).toBe('PUBLISH')
  expect(judge).not.toHaveBeenCalled()
  expect(publish).toHaveBeenCalledWith('zero', { verdict: null, threshold: 0 })
  expect(await settleSubmission({ linkId: 'sem-chave', judge: null, load: async () => pending, readThreshold: async () => 0, publish })).toBe('PUBLISH')
})
it('registra o motivo da revisão sem chamar publicação', async () => {
  const publish = vi.fn(async () => undefined), recordReview = vi.fn(async () => undefined)
  const verdict = { pass: false, confidence: 0.99, reasons: ['Conteúdo incompatível'] }
  expect(await settleSubmission({ linkId: 'recusado', judge: async () => verdict, load: async () => pending, readThreshold: async () => 0.85, publish, recordReview })).toBe('ADMIN')
  expect(recordReview).toHaveBeenCalledWith('recusado', expect.objectContaining({ verdict, threshold: 0.85, decisionReason: expect.stringContaining('não aprovou') }))
  expect(publish).not.toHaveBeenCalled()
})
