import type { UsersRepository } from '../repositories/users-repository.js'

interface GetProfileUseCaseRequest {
  userId: string
}

interface GetProfileUseCaseResponse {
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    isProfile: boolean
    createdAt: Date
  }
}

export class GetProfileUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
  }: GetProfileUseCaseRequest): Promise<GetProfileUseCaseResponse> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new Error('User not found')
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isProfile: user.isProfile,
        createdAt: user.createdAt,
      },
    }
  }
}
