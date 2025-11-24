import type { UsersRepository } from '../repositories/users-repository.js'

interface DeleteAccountRequest {
  userId: string
}

class UserNotFoundError extends Error {
  constructor() {
    super('User not found')
    this.name = 'UserNotFoundError'
  }
}

export class DeleteAccountUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute(request: DeleteAccountRequest): Promise<void> {
    // Verificar se o usuário existe
    const user = await this.usersRepository.findById(request.userId)

    if (!user) {
      throw new UserNotFoundError()
    }

    // Deletar o usuário (todas as relações serão deletadas automaticamente via CASCADE)
    await this.usersRepository.delete(request.userId)
  }
}

export { UserNotFoundError }

