import { Queue } from 'bullmq'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

const QUEUE_NAME = 'divulgador-links'
const JOB_NAME = 'purge-analytics'

const testJobs: string[] = []
let queue: Queue | null = null

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: createRedis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  }
  return queue
}

export function resetAnalyticsPurgeJobsForTest(): void {
  testJobs.length = 0
}

export function getAnalyticsPurgeJobsForTest(): readonly string[] {
  return testJobs
}

export async function enqueueAnalyticsPurge(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    if (!testJobs.includes(JOB_NAME)) testJobs.push(JOB_NAME)
    return
  }
  try {
    await getQueue().add(JOB_NAME, {}, {
      jobId: JOB_NAME,
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!message.includes('Job') && !message.includes('exists')) throw error
  }
}
