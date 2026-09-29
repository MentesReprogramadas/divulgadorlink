import { describe, expect, it, vi } from 'vitest'
import type { LinkEmbedSnapshot } from '@/adapters/queues/enqueue-embed-link'
import { EMBEDDING_DIMENSIONS } from '@/domain/embeddings/embedding-service'
import {
  listEmbeddingIntents,
  processEmbeddingIntent,
  recordEmbeddingIntent,
  reprocessEmbeddingIntent,
  resetEmbeddingIntentsForTest,
  tryDispatchEmbedding,
} from '@/use-cases/@Search/embedding-outbox'

const snapshot: LinkEmbedSnapshot = {
  status: 'PUBLISHED',
  name: 'Ferrari',
  description: 'esportivo',
  networkId: 'net',
  nicheId: 'niche',
}

function vector() {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1)
}

describe('outbox de embedding', () => {
  it('guarda a intenção quando o Redis falha e processa depois', async () => {
    resetEmbeddingIntentsForTest()
    const intent = recordEmbeddingIntent('link-1', snapshot)
    const dispatched = await tryDispatchEmbedding(intent.id, async () => {
      throw new Error('redis fora')
    })

    expect(dispatched).toBe('pending')
    expect(listEmbeddingIntents('link-1')[0]?.status).toBe('PENDING')
    expect(listEmbeddingIntents('link-1')[0]?.lastError).toBe('redis fora')

    const saved: number[][] = []
    const done = await processEmbeddingIntent({
      intentId: intent.id,
      current: snapshot,
      niche: 'Carros',
      network: 'Telegram',
      embedding: { embed: async () => vector() },
      save: async (value) => {
        saved.push(value)
      },
    })

    expect(done.status).toBe('DONE')
    expect(saved).toHaveLength(1)
  })

  it('não chama o modelo de novo no job duplicado', async () => {
    resetEmbeddingIntentsForTest()
    const intent = recordEmbeddingIntent('link-1', snapshot)
    const embed = vi.fn(async () => vector())
    const input = {
      intentId: intent.id,
      current: snapshot,
      niche: 'Carros',
      network: 'Telegram',
      embedding: { embed },
      save: async () => undefined,
    }
    await processEmbeddingIntent(input)
    await processEmbeddingIntent(input)
    expect(embed).toHaveBeenCalledTimes(1)
  })

  it('agenda retry com backoff quando a OpenAI falha e permite reprocessar', async () => {
    resetEmbeddingIntentsForTest()
    const intent = recordEmbeddingIntent('link-1', snapshot, 1_000)
    const failed = await processEmbeddingIntent({
      intentId: intent.id,
      current: snapshot,
      niche: 'Carros',
      network: 'Telegram',
      embedding: { embed: async () => { throw new Error('timeout') } },
      save: async () => undefined,
      now: 1_000,
    })

    expect(failed.status).toBe('PENDING')
    expect(failed.attempts).toBe(1)
    expect(failed.nextAttemptAt).toBeGreaterThan(1_000)
    expect(failed.lastError).toBe('timeout')

    const early = await processEmbeddingIntent({
      intentId: intent.id,
      current: snapshot,
      niche: 'Carros',
      network: 'Telegram',
      embedding: { embed: async () => vector() },
      save: async () => undefined,
      now: 1_000,
    })
    expect(early.attempts).toBe(1)

    const again = reprocessEmbeddingIntent(intent.id, 5_000)
    expect(again.status).toBe('PENDING')
    expect(again.attempts).toBe(0)
    const saved: number[][] = []
    const recovered = await processEmbeddingIntent({
      intentId: intent.id,
      current: snapshot,
      niche: 'Carros',
      network: 'Telegram',
      embedding: { embed: async () => vector() },
      save: async (value) => { saved.push(value) },
      now: 5_000,
    })
    expect(recovered.status).toBe('DONE')
    expect(saved).toHaveLength(1)
  })

  it('abre outra intenção se o link muda durante o processamento', async () => {
    resetEmbeddingIntentsForTest()
    const intent = recordEmbeddingIntent('link-1', snapshot)
    await processEmbeddingIntent({
      intentId: intent.id,
      current: { ...snapshot, name: 'Porsche' },
      niche: 'Carros',
      network: 'Telegram',
      embedding: { embed: async () => vector() },
      save: async () => undefined,
    })

    const rows = listEmbeddingIntents('link-1')
    expect(rows.some((row) => row.status === 'DONE' && row.snapshot.name === 'Ferrari')).toBe(true)
    expect(rows.some((row) => row.status === 'PENDING' && row.snapshot.name === 'Porsche')).toBe(true)
  })

  it('não duplica intenção aberta do mesmo snapshot', () => {
    resetEmbeddingIntentsForTest()
    const first = recordEmbeddingIntent('link-1', snapshot)
    const second = recordEmbeddingIntent('link-1', snapshot)
    expect(second.id).toBe(first.id)
    expect(listEmbeddingIntents('link-1')).toHaveLength(1)
  })
})
