import { describe, expect, it } from 'vitest'
import { settleSubmission, type SubmissionSnapshot } from '@/use-cases/@Moderation/settle-submission'

const pending: SubmissionSnapshot = {
  status: 'PENDING_MODERATION',
  name: 'Grupo de receitas',
  description: 'Receitas da semana',
  nicheName: 'Culinária',
  tenantId: 'tenant',
}

describe('settleSubmission', () => {
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
