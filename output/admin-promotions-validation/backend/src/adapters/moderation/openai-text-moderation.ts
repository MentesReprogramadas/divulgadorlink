import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'

export class ModerationProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModerationProviderError'
  }
}

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> }

export function parseVerdict(raw: string | undefined): ModelVerdict {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const row = parsed as { pass?: unknown; confidence?: unknown; reasons?: unknown }
  if (typeof row.pass !== 'boolean') return null
  if (typeof row.confidence !== 'number' || row.confidence < 0 || row.confidence > 1) return null
  const reasons = Array.isArray(row.reasons) ? row.reasons.filter((item): item is string => typeof item === 'string') : []
  return { pass: row.pass, confidence: row.confidence, reasons }
}

export class OpenAiTextModeration {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly model = 'gpt-4o-mini',
    private readonly timeoutMs = 10_000,
  ) {}

  async judge(input: { name: string; description: string; niche: string }): Promise<ModelVerdict> {
    let response: Response
    try {
      response = await this.fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Avalie se o nome e a descrição de um link de grupo combinam com o nicho e não contêm conteúdo proibido. Responda só JSON: {"pass": boolean, "confidence": número de 0 a 1, "reasons": string[]}.',
            },
            { role: 'user', content: JSON.stringify(input) },
          ],
        }),
      })
    } catch (error) {
      throw new ModerationProviderError(error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'rede')
    }
    if (!response.ok) throw new ModerationProviderError(`status ${response.status}`)
    const body = (await response.json()) as ChatResponse
    return parseVerdict(body.choices?.[0]?.message?.content)
  }
}
