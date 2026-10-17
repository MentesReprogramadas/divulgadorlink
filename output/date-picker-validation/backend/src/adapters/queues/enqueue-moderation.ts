import { Queue } from 'bullmq'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

const QUEUE_NAME = 'divulgador-links'
const recorded: string[] = []
let queue: Queue | null = null

export function moderationJobsForTest(): readonly string[] {
  return recorded
}

export function resetModerationJobsForTest(): void {
  recorded.length = 0
}

export async function enqueueModeration(linkId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    recorded.push(linkId)
    return
  }
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: createRedis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  }
  try {
    await queue.add('moderate-link', { linkId }, {
      jobId: `moderate-${linkId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!message.includes('Job') && !message.includes('exists')) throw error
  }
}
