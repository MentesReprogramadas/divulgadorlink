export interface RefundScheduler {
  scheduleRetry(orderId: string): Promise<void>
}
