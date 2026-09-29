export interface PromotionActivator {
  activateFromPaidOrder(orderId: string): Promise<void>
}
