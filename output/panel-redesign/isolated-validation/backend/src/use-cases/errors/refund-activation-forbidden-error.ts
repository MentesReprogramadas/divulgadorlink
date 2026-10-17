export class RefundActivationForbiddenError extends Error {
  constructor() {
    super('Pagamento tardio não gera promoção.')
  }
}
