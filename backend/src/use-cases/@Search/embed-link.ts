import { EMBEDDING_DIMENSIONS, buildLinkEmbeddingText, type EmbeddingService } from '@/domain/embeddings/embedding-service'

export async function embedLink(input: {
  link: { name: string; description: string; niche: string; network: string }
  embedding: EmbeddingService
  save: (vector: number[]) => Promise<void>
}): Promise<void> {
  const vector = await input.embedding.embed(buildLinkEmbeddingText(input.link))
  if (vector.length !== EMBEDDING_DIMENSIONS) throw new Error('dimensão')
  await input.save(vector)
}
