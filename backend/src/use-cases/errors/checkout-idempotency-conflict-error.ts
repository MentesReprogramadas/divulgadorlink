export class CheckoutIdempotencyConflictError extends Error {
  constructor() {
    super('Chave de idempotência já utilizada para outra seleção.')
    this.name = 'CheckoutIdempotencyConflictError'
  }
}
