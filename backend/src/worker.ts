import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { readConfig, type ConfigKey } from '@/domain/config/read-config'
import { env } from '@/env'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'

export type ModerateLinkJobData = {
  configRows: Partial<Record<ConfigKey, string>>
  verdict: { pass: boolean; confidence: number; reasons: string[] } | null
}

export function moderateLink(data: ModerateLinkJobData): 'PUBLISH' | 'ADMIN' {
  const threshold = readConfig(data.configRows, 'MODERATION_AUTO_APPROVE_THRESHOLD')
  return applyAiVerdict(data.verdict, threshold)
}

export const handlers = {
  'moderate-link': moderateLink,
} as const satisfies Record<string, (data: ModerateLinkJobData) => 'PUBLISH' | 'ADMIN'>

const QUEUE_NAME = 'divulgador-links'

async function startWorker(): Promise<void> {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name as keyof typeof handlers]
      if (!handler) throw new Error(`job desconhecido: ${job.name}`)
      return handler(job.data as ModerateLinkJobData)
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
