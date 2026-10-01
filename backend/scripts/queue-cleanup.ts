import { Queue } from 'bullmq'
import Redis from 'ioredis'

const STATES = ['wait', 'delayed', 'completed', 'failed', 'paused', 'prioritized', 'waiting-children'] as const

export async function removeCorrelatedJobs(redisUrl: string, queueName: string, marker: string): Promise<{ removed: string[]; leftovers: string[] }> {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null })
  const queue = new Queue(queueName, { connection })
  try {
    const removed: string[] = []
    for (const job of await queue.getJobs([...STATES])) {
      if (!job?.id || !job.id.includes(marker)) continue
      await job.remove()
      removed.push(job.id)
    }
    const leftovers = await connection.keys(`bull:${queueName}:*${marker}*`)
    return { removed, leftovers }
  } finally {
    await queue.close()
    await connection.quit()
  }
}
