import { Queue } from 'bullmq'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

let queue: Queue | null = null
export const EVOLUTION_QUEUE_NAME = 'divulgador-evolution'
export async function enqueueEvolutionCycle(): Promise<void> {
  if (env.NODE_ENV === 'test') return
  queue ??= new Queue(EVOLUTION_QUEUE_NAME, { connection: createRedis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  await queue.add('evolution-cycle', {}, { jobId: 'evolution-cycle', removeOnComplete: true, removeOnFail: true, attempts: 3, backoff: { type: 'exponential', delay: 1000 } })
}
