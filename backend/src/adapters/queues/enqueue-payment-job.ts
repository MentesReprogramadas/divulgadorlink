import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { env } from '@/env'

const QUEUE_NAME = 'divulgador-links'

type RecordedJob = { name: 'expire-pix' | 'refund-pix' | 'notify-refund-failed'; orderId: string; delay: number }

const testJobs: RecordedJob[] = []
let queue: Queue | null = null

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  }
  return queue
}

export function resetPaymentJobsForTest(): void {
  testJobs.length = 0
}

export function getPaymentJobsForTest(): readonly RecordedJob[] {
  return testJobs
}

async function add(name: RecordedJob['name'], orderId: string, delay: number, jobId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    testJobs.push({ name, orderId, delay })
    return
  }
  try {
    await getQueue().add(name, { orderId }, {
      jobId,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!message.includes('Job') && !message.includes('exists')) throw error
  }
}

export function enqueueExpirePix(orderId: string, delayMs: number): Promise<void> {
  return add('expire-pix', orderId, delayMs, `expire-${orderId}`)
}

export function enqueueRefundPix(orderId: string, attempt = 1): Promise<void> {
  return add('refund-pix', orderId, 60_000, `refund-${orderId}-${attempt}`)
}

export function enqueueRefundNotification(orderId: string): Promise<void> {
  return add('notify-refund-failed', orderId, 0, `notify-refund-${orderId}`)
}
