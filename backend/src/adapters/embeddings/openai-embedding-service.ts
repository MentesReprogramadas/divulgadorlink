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
  ) {}

  async embed(text: string): Promise<number[]> {
    const response = await this.fetchImpl('https://api.openai.com/v1/embeddings', {
      method: 'POST',
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
