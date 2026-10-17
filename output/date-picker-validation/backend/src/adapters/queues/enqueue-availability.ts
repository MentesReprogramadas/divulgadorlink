import { Queue } from 'bullmq'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'
import { monitorPolicy } from '@/domain/links/availability-monitor'

export const AVAILABILITY_QUEUE_NAME = 'divulgador-availability'
let queue: Queue | null = null
export async function enqueueAvailabilityCycle(): Promise<void> {
  if (env.NODE_ENV === 'test' || !monitorPolicy(process.env).enabled) return
  queue ??= new Queue(AVAILABILITY_QUEUE_NAME, { connection: createRedis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  await queue.add('availability-cycle', {}, { jobId: 'availability-cycle', removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}
