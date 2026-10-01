import { describe, expect, it } from 'vitest'
import {
  ModerationProviderError,
  OpenAiTextModeration,
  parseVerdict,
} from '@/adapters/moderation/openai-text-moderation'
import { decideProposedText } from '@/use-cases/@Links/proposed-text-decision'

const TEXT = { name: 'Receitas', description: 'bolos', niche: 'Culinária' }

function chat(content: string, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })) as typeof fetch
}

describe('moderação de texto por modelo', () => {
  it('parseVerdict aceita só o contrato e rejeita confiança fora de 0..1', () => {
    expect(parseVerdict('{"pass":true,"confidence":0.9,"reasons":["ok",1]}')).toEqual({ pass: true, confidence: 0.9, reasons: ['ok'] })
    expect(parseVerdict('{"pass":"sim","confidence":0.9}')).toBeNull()
    expect(parseVerdict('{"pass":true,"confidence":1.5}')).toBeNull()
    expect(parseVerdict('não é json')).toBeNull()
    expect(parseVerdict(undefined)).toBeNull()
  })

  it('adapter devolve o veredito do provedor e não expõe a chave no corpo', async () => {
    let seen: RequestInit | undefined
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      seen = init
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"pass":true,"confidence":0.95,"reasons":[]}' } }] }))
    }) as typeof fetch
    const verdict = await new OpenAiTextModeration('sk-teste', fetchImpl).judge(TEXT)
    expect(verdict).toEqual({ pass: true, confidence: 0.95, reasons: [] })
    expect(String(seen?.body)).not.toContain('sk-teste')
    expect(seen?.signal).toBeInstanceOf(AbortSignal)
  })

  it('status de erro e timeout viram ModerationProviderError', async () => {
    await expect(new OpenAiTextModeration('k', chat('{}', 500)).judge(TEXT)).rejects.toBeInstanceOf(ModerationProviderError)
    const slow = ((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    })) as typeof fetch
    await expect(new OpenAiTextModeration('k', slow, 'gpt-4o-mini', 20).judge(TEXT)).rejects.toThrow('timeout')
  })

  it('resposta malformada do provedor não publica', async () => {
    const verdict = await new OpenAiTextModeration('k', chat('lixo')).judge(TEXT)
    expect(verdict).toBeNull()
    expect(decideProposedText({ publishedName: 'A', proposedName: 'B', blocklisted: false, verdict, threshold: 0.8 }))
      .toEqual({ decision: 'ADMIN', visibleName: 'A', provider: 'unavailable' })
  })

  it('decisão publica só com pass e confiança acima do limiar', () => {
    const base = { publishedName: 'A', proposedName: 'B', blocklisted: false, threshold: 0.8 }
    expect(decideProposedText({ ...base, verdict: { pass: true, confidence: 0.9, reasons: [] } }))
      .toEqual({ decision: 'PUBLISH', visibleName: 'B', provider: 'adapter' })
    expect(decideProposedText({ ...base, verdict: { pass: true, confidence: 0.5, reasons: [] } }).decision).toBe('ADMIN')
    expect(decideProposedText({ ...base, verdict: { pass: false, confidence: 0.99, reasons: [] } }).decision).toBe('ADMIN')
    expect(decideProposedText({ ...base, blocklisted: true, verdict: { pass: true, confidence: 0.99, reasons: [] } }))
      .toMatchObject({ decision: 'ADMIN', visibleName: 'A' })
  })
})
