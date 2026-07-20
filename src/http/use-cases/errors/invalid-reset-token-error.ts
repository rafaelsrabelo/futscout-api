export class InvalidResetTokenError extends Error {
  constructor() {
    super('Token de redefinição inválido ou expirado.')
  }
}
