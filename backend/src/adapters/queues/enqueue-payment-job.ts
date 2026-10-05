import { Queue } from 'bullmq'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

const QUEUE_NAME = 'divulgador-links'

type RecordedJob = { name: 'expire-pix' | 'refund-pix' | 'notify-refund-failed' | 'charge-order'; orderId: string; delay: number }

const testJobs: RecordedJob[] = []
let queue: Queue | null = null

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: createRedis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  }
  return queue
}

export async function closePaymentJobQueue(): Promise<void> {
  if (!queue) return
  const current = queue
  queue = null
  const connection = await current.client
  await current.close()
  await connection.quit()
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

export function enqueueChargeOrder(orderId: string, delayMs = 30_000): Promise<void> {
  return add('charge-order', orderId, delayMs, `charge-${orderId}`)
}

export async function enqueueUnchargedOrders(now = new Date()): Promise<number> {
  if (process.env.NODE_ENV === 'test') return 0
  const { prisma } = await import('@/lib/prisma')
  const cutoff = new Date(now.getTime() - 30_000)
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM orders WHERE status = 'PENDING_PAYMENT' AND "gatewayChargeId" IS NULL AND "createdAt" < $1`,
    cutoff,
  )
  for (const row of rows) await enqueueChargeOrder(row.id, 0)
  return rows.length
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
