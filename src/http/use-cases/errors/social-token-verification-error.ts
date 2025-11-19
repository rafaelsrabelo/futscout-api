export class SocialTokenVerificationError extends Error {
  constructor(message = 'Falha ao validar o token do provedor social') {
    super(message)
  }
}
