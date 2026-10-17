import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingService,
} from '@/domain/embeddings/embedding-service'

interface OpenAiEmbeddingsResponse {
  data?: Array<{ embedding?: number[] }>
}

export class OpenAiEmbeddingService implements EmbeddingService {
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
    private model = 'text-embedding-3-large',
    private dimensions = EMBEDDING_DIMENSIONS,
    private timeoutMs = 10_000,
  ) {}

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY ausente.')
    const response = await this.fetchImpl('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI respondeu ${response.status}.`)
    }

    const body = (await response.json()) as OpenAiEmbeddingsResponse
    const vector = body.data?.[0]?.embedding

    if (!vector || vector.length !== this.dimensions) {
      throw new Error('OpenAI devolveu um vetor com dimensão inesperada.')
    }

    return vector
  }
}
