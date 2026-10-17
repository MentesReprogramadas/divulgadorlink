export interface RefundScheduler {
  scheduleRetry(orderId: string, attempt?: number): Promise<void>
}
