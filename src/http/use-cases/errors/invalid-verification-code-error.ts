export class InvalidVerificationCodeError extends Error {
  constructor() {
    super('Código inválido ou expirado.')
  }
}
