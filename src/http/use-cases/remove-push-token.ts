import type { PushTokensRepository } from '../repositories/push-tokens-repository.js'

interface RemovePushTokenUseCaseRequest {
  userId: string
  token: string
}

export class RemovePushTokenUseCase {
  constructor(private pushTokensRepository: PushTokensRepository) {}

  // Idempotente: se o token não existe ou pertence a outro usuário, não faz nada.
  // Não revela existência cruzando usuários.
  async execute({
    userId,
    token,
  }: RemovePushTokenUseCaseRequest): Promise<void> {
    const all = await this.pushTokensRepository.findManyByUserIds([userId])
    const owned = all.find((t) => t.token === token)
    if (!owned) return
    await this.pushTokensRepository.deleteByToken(token)
  }
}
