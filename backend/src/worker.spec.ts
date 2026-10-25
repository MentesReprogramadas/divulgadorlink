import { describe, expect, it } from 'vitest'
import { handlers,startWebhookWorker } from '@/worker'

describe('worker moderate-link', () => {
  it('recusa o consumidor local fora do ambiente de desenvolvimento antes de abrir a fila',async()=>{
    await expect(startWebhookWorker()).rejects.toThrow('NODE_ENV=dev')
  })
  it('usa o limiar de readConfig e manda null para ADMIN', () => {
    const threshold = 0.72
    const run = handlers['moderate-link']
    expect(
      run({
        configRows: { MODERATION_AUTO_APPROVE_THRESHOLD: String(threshold) },
        verdict: { pass: true, confidence: 0.73, reasons: [] },
      }),
    ).toBe('PUBLISH')
    expect(
      run({
        configRows: { MODERATION_AUTO_APPROVE_THRESHOLD: String(threshold) },
        verdict: { pass: true, confidence: 0.71, reasons: [] },
      }),
    ).toBe('ADMIN')
    expect(
      run({
        configRows: { MODERATION_AUTO_APPROVE_THRESHOLD: String(threshold) },
        verdict: null,
      }),
    ).toBe('ADMIN')
  })
})
