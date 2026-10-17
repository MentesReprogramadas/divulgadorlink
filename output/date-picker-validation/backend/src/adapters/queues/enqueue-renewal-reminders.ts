import { Queue } from 'bullmq'
import { createRedis } from '@/lib/redis'
import { env } from '@/env'
import { renewalReminderPolicy } from '@/domain/notifications/renewal-reminder'

export const RENEWAL_QUEUE_NAME = 'divulgador-renewal-reminders'
let queue: Queue | null = null
export async function enqueueRenewalReminderCycle(): Promise<void> {
  if (env.NODE_ENV === 'test' || !renewalReminderPolicy(process.env).enabled) return
  queue ??= new Queue(RENEWAL_QUEUE_NAME, { connection: createRedis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  await queue.add('renewal-reminder-cycle', {}, { jobId: 'renewal-reminder-cycle', removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}
