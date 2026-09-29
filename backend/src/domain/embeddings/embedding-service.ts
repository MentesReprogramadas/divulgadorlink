export const EMBEDDING_DIMENSIONS = 1536

export interface EmbeddingService {
  embed(text: string): Promise<number[]>
}

export function buildLinkEmbeddingText(input: {
  name: string
  description: string
  niche: string
  network: string
}): string {
  return [input.name, input.description, input.niche, input.network]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('\n')
}
