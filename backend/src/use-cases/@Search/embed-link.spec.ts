import { describe, expect, it } from 'vitest'
import { buildLinkEmbeddingText } from '@/domain/embeddings/embedding-service'
import { embedLink } from '@/use-cases/@Search/embed-link'

describe('embedding', () => {
  it('grava o vetor fora da request e exige 1536', async () => {
    const saved: number[][] = []
    await embedLink({
      link: { name: 'Ferrari', description: 'esportivo', niche: 'Carros', network: 'Telegram' },
      embedding: { embed: async () => Array.from({ length: 1536 }, () => 0.1) },
      save: async (vector) => { saved.push(vector) },
    })
    expect(buildLinkEmbeddingText({
      name: 'Ferrari', description: 'esportivo', niche: 'Carros', network: 'Telegram',
    })).toBe('Ferrari\nesportivo\nCarros\nTelegram')
    expect(saved[0]).toHaveLength(1536)
  })
})
