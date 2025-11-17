import type { User } from '../../../generated/prisma/client.js'
import type { UsersRepository } from '../repositories/users-repository.js'

interface UpdateUserRoleRequest {
  userId: string
  role: 'ATHLETE' | 'OBSERVER'
}

interface UpdateUserRoleResponse {
  user: User
}

export class UpdateUserRoleUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
    role,
  }: UpdateUserRoleRequest): Promise<UpdateUserRoleResponse> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new Error('User not found')
    }

    // Permitir atualização da role (removida validação que impedia mudança)
    const updatedUser = await this.usersRepository.update(userId, { role })

    return {
      user: updatedUser,
    }
  }
}
