import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { OpenAiEmbeddingService } from '@/adapters/embeddings/openai-embedding-service'
import { WooviPixPaymentGateway } from '@/adapters/payments/woovi-pix-payment-gateway'
import { enqueueEmbedLink } from '@/adapters/queues/enqueue-embed-link'
import { readConfig, type ConfigKey } from '@/domain/config/read-config'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'
import { embedLink } from '@/use-cases/@Search/embed-link'
import { runExpirePix, runNotifyRefundFailed, runRefundPix } from '@/use-cases/@Payments/payment-jobs'

export type ModerateLinkJobData = {
  configRows: Partial<Record<ConfigKey, string>>
  verdict: { pass: boolean; confidence: number; reasons: string[] } | null
}

export type EmbedLinkJobData = {
  linkId: string
  intentId?: string
}

export function moderateLink(data: ModerateLinkJobData): 'PUBLISH' | 'ADMIN' {
  const threshold = readConfig(data.configRows, 'MODERATION_AUTO_APPROVE_THRESHOLD')
  return applyAiVerdict(data.verdict, threshold)
}

export async function embedLinkJob(data: EmbedLinkJobData): Promise<void> {
  if (data.intentId) {
    const intent = await prisma.embeddingJob.findUnique({ where: { id: data.intentId } })
    if (!intent || intent.status === 'DONE') return
  }

  const row = await prisma.link.findUnique({
    where: { id: data.linkId },
    include: {
      network: { select: { name: true } },
      niche: { select: { name: true } },
    },
  })
  if (!row) {
    throw new Error(`link não encontrado: ${data.linkId}`)
  }

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente')
  }

  if (data.intentId) {
    await prisma.embeddingJob.update({
      where: { id: data.intentId },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    })
  }

  try {
    await embedLink({
      link: {
        name: row.name,
        description: row.description,
        niche: row.niche.name,
        network: row.network.name,
      },
      embedding: new OpenAiEmbeddingService(apiKey),
      save: async (vector) => {
        const literal = `[${vector.join(',')}]`
        await prisma.$transaction([
          prisma.$executeRawUnsafe(
            'UPDATE "links" SET "embedding" = $1::vector, "embeddingState" = \'READY\' WHERE "id" = $2',
            literal,
            data.linkId,
          ),
          ...(data.intentId
            ? [prisma.embeddingJob.update({
              where: { id: data.intentId },
              data: { status: 'DONE', lastError: null },
            })]
            : []),
        ])
      },
    })
  } catch (error) {
    if (data.intentId) {
      await prisma.embeddingJob.update({
        where: { id: data.intentId },
        data: {
          status: 'PENDING',
          lastError: error instanceof Error ? error.message : 'embedding falhou',
          nextAttemptAt: new Date(Date.now() + 1_000),
        },
      })
    }
    throw error
  }
}

export async function enqueuePendingEmbeddingJobs(): Promise<number> {
  const due = await prisma.embeddingJob.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })
  for (const job of due) {
    try {
      await enqueueEmbedLink(job.linkId, job.id)
    } catch (error) {
      await prisma.embeddingJob.update({
        where: { id: job.id },
        data: { lastError: error instanceof Error ? error.message : 'fila indisponível' },
      })
    }
  }
  return due.length
}

export const handlers = {
  'moderate-link': moderateLink,
  'embed-link': embedLinkJob,
} as const

const QUEUE_NAME = 'divulgador-links'

async function startWorker(): Promise<void> {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'moderate-link') {
        return moderateLink(job.data as ModerateLinkJobData)
      }
      if (job.name === 'embed-link') {
        return embedLinkJob(job.data as EmbedLinkJobData)
      }
      if (job.name === 'expire-pix') {
        return runExpirePix((job.data as { orderId: string }).orderId)
      }
      if (job.name === 'refund-pix') {
        return runRefundPix(
          (job.data as { orderId: string }).orderId,
          new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? ''),
        )
      }
      if (job.name === 'notify-refund-failed') {
        return runNotifyRefundFailed((job.data as { orderId: string }).orderId)
      }
      throw new Error(`job desconhecido: ${job.name}`)
    },
    { connection },
  )
  worker.on('failed', (job, error) => {
    if (!job || job.name !== 'embed-link') return
    const attempts = job.opts.attempts ?? 1
    if (job.attemptsMade < attempts) return
    const data = job.data as EmbedLinkJobData
    void prisma.link.update({ where: { id: data.linkId }, data: { embeddingState: 'FAILED' } })
    if (data.intentId) {
      void prisma.embeddingJob.update({
        where: { id: data.intentId },
        data: { status: 'FAILED', lastError: error.message },
      })
    }
  })
  await enqueuePendingEmbeddingJobs()
  const drain = setInterval(() => {
    void enqueuePendingEmbeddingJobs().catch((error) => {
      console.error(error)
    })
  }, 30_000)
  drain.unref()
}

if (require.main === module) {
  startWorker().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
