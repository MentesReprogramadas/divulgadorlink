export class InvalidVerificationCodeError extends Error {
  constructor(message = 'Código inválido ou expirado.') {
    super(message)
  }
}
