export const PIX_EXPIRES_IN_SECONDS = 1800
export const PIX_EXPIRATION_MIN_SECONDS = 3

export class PixExpirationConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PixExpirationConfigError'
  }
}

export function parsePixExpiration(raw: string | undefined, nodeEnv: string | undefined): number {
  if (raw === undefined || raw === '') return PIX_EXPIRES_IN_SECONDS
  if (nodeEnv === 'production') {
    throw new PixExpirationConfigError('PIX_EXPIRATION_SECONDS não é aceito em produção.')
  }
  if (!/^\d+$/.test(raw)) throw new PixExpirationConfigError('PIX_EXPIRATION_SECONDS deve ser inteiro.')
  const value = Number(raw)
  if (value < PIX_EXPIRATION_MIN_SECONDS || value > PIX_EXPIRES_IN_SECONDS) {
    throw new PixExpirationConfigError(
      `PIX_EXPIRATION_SECONDS deve ficar entre ${PIX_EXPIRATION_MIN_SECONDS} e ${PIX_EXPIRES_IN_SECONDS}.`,
    )
  }
  return value
}

export function pixExpiresInSeconds(source: NodeJS.ProcessEnv = process.env): number {
  return parsePixExpiration(source.PIX_EXPIRATION_SECONDS, source.NODE_ENV)
}
