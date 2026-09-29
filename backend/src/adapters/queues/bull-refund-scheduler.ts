import type { RefundScheduler } from '@/domain/payments/refund-scheduler'

export interface JobQueue {
  add(
    name: string,
    data: { orderId: string },
    options: { jobId: string; delay: number; attempts: number; backoff: { type: 'exponential'; delay: number } },
  ): Promise<unknown>
}

const REFUND_RETRY_DELAY_MS = 60_000

export class BullRefundScheduler implements RefundScheduler {
  constructor(private queue: JobQueue) {}

  async scheduleRetry(orderId: string, attempt = 1): Promise<void> {
    await this.queue.add(
      'refund-pix',
      { orderId },
      {
        jobId: `refund-${orderId}-${attempt}`,
        delay: REFUND_RETRY_DELAY_MS,
        attempts: 1,
        backoff: { type: 'exponential', delay: REFUND_RETRY_DELAY_MS },
      },
    )
  }
}
