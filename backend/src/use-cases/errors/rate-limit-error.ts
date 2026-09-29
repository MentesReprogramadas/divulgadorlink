export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
  }
}
