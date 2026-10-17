import type { EmbeddingService } from '@/domain/embeddings/embedding-service'
import { embedLink } from '@/use-cases/@Search/embed-link'
import type { LinkEmbedSnapshot } from '@/adapters/queues/enqueue-embed-link'

export const EMBEDDING_MAX_ATTEMPTS = 5

export type EmbeddingIntentStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export type EmbeddingIntent = {
  id: string
  linkId: string
  status: EmbeddingIntentStatus
  attempts: number
  nextAttemptAt: number
  lastError: string | null
  snapshot: LinkEmbedSnapshot
}

const intents: EmbeddingIntent[] = []
let sequence = 0

function snapshotsMatch(left: LinkEmbedSnapshot, right: LinkEmbedSnapshot): boolean {
  return (
    left.name === right.name &&
    left.description === right.description &&
    left.networkId === right.networkId &&
    left.nicheId === right.nicheId &&
    left.status === right.status
  )
}

export function resetEmbeddingIntentsForTest(): void {
  intents.length = 0
  sequence = 0
}

export function listEmbeddingIntents(linkId?: string): EmbeddingIntent[] {
  return intents.filter((row) => (linkId ? row.linkId === linkId : true)).map((row) => ({ ...row, snapshot: { ...row.snapshot } }))
}

export function recordEmbeddingIntent(linkId: string, snapshot: LinkEmbedSnapshot, now = Date.now()): EmbeddingIntent {
  const open = intents.find(
    (row) => row.linkId === linkId && (row.status === 'PENDING' || row.status === 'PROCESSING') && snapshotsMatch(row.snapshot, snapshot),
  )
  if (open) return { ...open, snapshot: { ...open.snapshot } }

  sequence += 1
  const intent: EmbeddingIntent = {
    id: `embed-${sequence}`,
    linkId,
    status: 'PENDING',
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
    snapshot: { ...snapshot },
  }
  intents.push(intent)
  return { ...intent, snapshot: { ...intent.snapshot } }
}

export async function tryDispatchEmbedding(
  intentId: string,
  enqueue: (payload: { linkId: string; intentId: string }) => Promise<void>,
): Promise<'queued' | 'pending'> {
  const intent = intents.find((row) => row.id === intentId)
  if (!intent || intent.status === 'DONE') return 'queued'
  try {
    await enqueue({ linkId: intent.linkId, intentId: intent.id })
    return 'queued'
  } catch (error) {
    intent.lastError = error instanceof Error ? error.message : 'fila indisponível'
    intent.status = 'PENDING'
    return 'pending'
  }
}

export async function processEmbeddingIntent(input: {
  intentId: string
  current: LinkEmbedSnapshot
  embedding: EmbeddingService
  niche: string
  network: string
  save: (vector: number[]) => Promise<void>
  now?: number
}): Promise<EmbeddingIntent> {
  const intent = intents.find((row) => row.id === input.intentId)
  if (!intent) throw new Error('intenção ausente')
  if (intent.status === 'DONE') return { ...intent, snapshot: { ...intent.snapshot } }
  if (intent.status === 'PROCESSING') return { ...intent, snapshot: { ...intent.snapshot } }

  const now = input.now ?? Date.now()
  if (intent.nextAttemptAt > now) return { ...intent, snapshot: { ...intent.snapshot } }

  intent.status = 'PROCESSING'
  intent.attempts += 1
  const snapshotAtStart = { ...intent.snapshot }

  try {
    await embedLink({
      link: {
        name: snapshotAtStart.name,
        description: snapshotAtStart.description,
        niche: input.niche,
        network: input.network,
      },
      embedding: input.embedding,
      save: input.save,
    })
    intent.status = 'DONE'
    intent.lastError = null
    if (!snapshotsMatch(snapshotAtStart, input.current)) {
      recordEmbeddingIntent(intent.linkId, input.current, now)
    }
  } catch (error) {
    intent.lastError = error instanceof Error ? error.message : 'embedding falhou'
    if (intent.attempts >= EMBEDDING_MAX_ATTEMPTS) {
      intent.status = 'FAILED'
    } else {
      intent.status = 'PENDING'
      intent.nextAttemptAt = now + 1000 * 2 ** (intent.attempts - 1)
    }
  }

  return { ...intent, snapshot: { ...intent.snapshot } }
}

export function reprocessEmbeddingIntent(intentId: string, now = Date.now()): EmbeddingIntent {
  const intent = intents.find((row) => row.id === intentId)
  if (!intent) throw new Error('intenção ausente')
  intent.status = 'PENDING'
  intent.attempts = 0
  intent.nextAttemptAt = now
  intent.lastError = null
  return { ...intent, snapshot: { ...intent.snapshot } }
}
