import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { OpenAiEmbeddingService } from '@/adapters/embeddings/openai-embedding-service'
import { readConfig, type ConfigKey } from '@/domain/config/read-config'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'
import { embedLink } from '@/use-cases/@Search/embed-link'

export type ModerateLinkJobData = {
  configRows: Partial<Record<ConfigKey, string>>
  verdict: { pass: boolean; confidence: number; reasons: string[] } | null
}

export type EmbedLinkJobData = {
  linkId: string
}

export function moderateLink(data: ModerateLinkJobData): 'PUBLISH' | 'ADMIN' {
  const threshold = readConfig(data.configRows, 'MODERATION_AUTO_APPROVE_THRESHOLD')
  return applyAiVerdict(data.verdict, threshold)
}

export async function embedLinkJob(data: EmbedLinkJobData): Promise<void> {
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
      await prisma.$executeRawUnsafe(
        'UPDATE "links" SET "embedding" = $1::vector WHERE "id" = $2',
        literal,
        data.linkId,
      )
    },
  })
}

export const handlers = {
  'moderate-link': moderateLink,
  'embed-link': embedLinkJob,
} as const

const QUEUE_NAME = 'divulgador-links'

async function startWorker(): Promise<void> {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'moderate-link') {
        return moderateLink(job.data as ModerateLinkJobData)
      }
      if (job.name === 'embed-link') {
        return embedLinkJob(job.data as EmbedLinkJobData)
      }
      throw new Error(`job desconhecido: ${job.name}`)
    },
    { connection },
  )
}

if (require.main === module) {
  startWorker().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
