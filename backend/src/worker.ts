import './observability/register-hyperdx'
import type { PrismaClient } from '@prisma/client'
import { Worker } from 'bullmq'
import type Redis from 'ioredis'
import { createRedis } from '@/lib/redis'
import { OpenAiEmbeddingService } from '@/adapters/embeddings/openai-embedding-service'
import Stripe from 'stripe'
import { OpenAiTextModeration } from '@/adapters/moderation/openai-text-moderation'
import { StripeCardPaymentGateway } from '@/adapters/payments/stripe-card-payment-gateway'
import { WooviPixPaymentGateway } from '@/adapters/payments/woovi-pix-payment-gateway'
import type { CheckoutGateway } from '@/use-cases/@Promotions/start-checkout'
import { claimCharge, releaseCharge } from '@/adapters/payments/charge-lock'
import { enqueueEmbedLink } from '@/adapters/queues/enqueue-embed-link'
import { enqueueExpirePix, enqueueUnchargedOrders } from '@/adapters/queues/enqueue-payment-job'
import { readConfig, type ConfigKey } from '@/domain/config/read-config'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { logDomainEvent, logJob } from '@/observability/logger'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'
import { publishSubmission, settleSubmission } from '@/use-cases/@Moderation/settle-submission'
import { PrismaConfigsRepository } from '@/repositories/configs-repository'
import { embedLink } from '@/use-cases/@Search/embed-link'
import { runExpirePix, runNotifyRefundFailed, runRefundPix } from '@/use-cases/@Payments/payment-jobs'
import { recoverUnchargedOrder } from '@/use-cases/@Payments/recover-uncharged'
import { runtimeCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'
import { settleProposedText } from '@/use-cases/@Links/settle-proposed-text'
import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { pixExpiresInSeconds } from '@/domain/payments/pix-expiration'
import { prismaRetentionView } from '@/repositories/analytics-retention'
import { runAnalyticsPurge } from '@/use-cases/@Analytics/purge-old-events'

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

function cardCheckoutGateway(secretKey: string): CheckoutGateway {
  const card = new StripeCardPaymentGateway(new Stripe(secretKey) as never)
  return {
    method: 'CARD',
    async createCharge(input) {
      const charge = await card.createCharge({ orderId: input.orderId, amountCents: input.amountCents })
      return { gatewayChargeId: charge.gatewayChargeId, clientSecret: charge.clientSecret }
    },
  }
}

export type TextJudge = (text: { name: string; description: string; niche: string }) => Promise<ModelVerdict>

export type WorkerDeps = {
  textJudge: TextJudge | null
  db?: PrismaClient
}

export function createWorker(connection: Redis, deps: WorkerDeps, queueName = QUEUE_NAME): Worker {
  const worker = new Worker(
    queueName,
    async (job) => {
      const started = Date.now()
      try {
      const result = await (async () => {
      if (job.name === 'moderate-link') {
        const data = job.data as ModerateLinkJobData & { linkId?: string }
        if (typeof data.linkId === 'string') {
          return settleSubmission({
            linkId: data.linkId,
            judge: deps.textJudge,
            finalAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
            load: async (linkId) => {
              const row = await prisma.link.findUnique({
                where: { id: linkId },
                include: { niche: { select: { name: true } } },
              })
              if (!row) return null
              return {
                status: row.status,
                name: row.name,
                description: row.description,
                nicheName: row.niche.name,
                tenantId: row.tenantId,
              }
            },
            readThreshold: async (tenantId) => {
              const config = await new PrismaConfigsRepository(prisma).findByTenantAndKey(tenantId, 'MODERATION_AUTO_APPROVE_THRESHOLD')
              if (!config) return null
              try {
                return readConfig({ MODERATION_AUTO_APPROVE_THRESHOLD: config.value }, 'MODERATION_AUTO_APPROVE_THRESHOLD')
              } catch {
                return null
              }
            },
            publish: publishSubmission,
          })
        }
        return moderateLink(data)
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
          new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? '', env.WOOVI_API_BASE_URL),
        )
      }
      if (job.name === 'notify-refund-failed') {
        return runNotifyRefundFailed((job.data as { orderId: string }).orderId)
      }
      if (job.name === 'charge-order') {
        const orderId = (job.data as { orderId: string }).orderId
        const pix = new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? '', env.WOOVI_API_BASE_URL)
        return recoverUnchargedOrder({
          store: runtimeCheckoutStore(),
          orderId,
          gateway: {
            method: 'PIX',
            async createCharge(input) {
              const charge = await pix.createCharge({
                orderId: input.orderId,
                amountCents: input.amountCents,
                expiresInSeconds: input.expiresInSeconds ?? pixExpiresInSeconds(),
              })
              return { gatewayChargeId: charge.gatewayChargeId, brCode: charge.brCode, expiresAt: charge.expiresAt }
            },
          },
          gateways: env.STRIPE_SECRET_KEY
            ? { CARD: cardCheckoutGateway(env.STRIPE_SECRET_KEY) }
            : undefined,
          claim: () => claimCharge(orderId),
          release: () => releaseCharge(orderId),
          scheduleExpire: enqueueExpirePix,
        })
      }
      if (job.name === 'text-proposed') {
        const linkId = (job.data as { linkId: string }).linkId
        const decision = await settleProposedText({
          linkId,
          judge: deps.textJudge ?? undefined,
          db: deps.db,
          finalAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
        })
        if (decision === 'PUBLISH') await enqueueEmbedLink(linkId)
        return decision
      }
      if (job.name === 'purge-analytics') {
        const deleted = await runAnalyticsPurge(prismaRetentionView(), new Date())
        if (deleted > 0) logDomainEvent('analytics.purged', { entity: String(deleted) })
        return deleted
      }
      throw new Error(`job desconhecido: ${job.name}`)
      })()
      logJob({
        queue: queueName,
        job_id: job.id ?? '',
        name: job.name,
        attempt: job.attemptsMade + 1,
        duration_ms: Date.now() - started,
        status: 'success',
        correlation_id: typeof (job.data as { requestId?: string })?.requestId === 'string'
          ? (job.data as { requestId: string }).requestId
          : undefined,
      })
      return result
      } catch (error) {
        logJob({
          queue: queueName,
          job_id: job.id ?? '',
          name: job.name,
          attempt: job.attemptsMade + 1,
          duration_ms: Date.now() - started,
          status: 'failure',
          error: error instanceof Error ? error.name : 'Error',
        })
        throw error
      }
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
  return worker
}

async function startWorker(): Promise<void> {
  const connection = createRedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const moderation = env.OPENAI_API_KEY ? new OpenAiTextModeration(env.OPENAI_API_KEY) : null
  createWorker(connection, { textJudge: moderation ? (text) => moderation.judge(text) : null })
  await enqueuePendingEmbeddingJobs()
  const drain = setInterval(() => {
    void enqueuePendingEmbeddingJobs().catch((error) => {
      logDomainEvent('embedding.drain.failed', { result: error instanceof Error ? error.message : 'fila' })
    })
    void enqueueUnchargedOrders().catch((error) => {
      logDomainEvent('payment.recover.failed', { result: error instanceof Error ? error.message : 'fila' })
    })
  }, 30_000)
  drain.unref()
  const day = 24 * 60 * 60 * 1000
  const purge = async () => {
    const deleted = await runAnalyticsPurge(prismaRetentionView(), new Date())
    if (deleted > 0) logDomainEvent('analytics.purged', { entity: String(deleted) })
  }
  void purge().catch((error) => {
    logDomainEvent('analytics.purge_failed', { result: error instanceof Error ? error.message : 'expurgo' })
  })
  const retention = setInterval(() => {
    void purge().catch((error) => {
      logDomainEvent('analytics.purge_failed', { result: error instanceof Error ? error.message : 'expurgo' })
    })
  }, day)
  retention.unref()
}

if (require.main === module) {
  startWorker().catch((err) => {
    const error = err instanceof Error ? err.stack ?? err.message : String(err)
    logDomainEvent('worker.start_failed', { error })
    process.exit(1)
  })
}
