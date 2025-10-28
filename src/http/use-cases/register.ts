import { hash } from 'bcryptjs'
import type { UsersRepository } from '../repositories/users-repository.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'
import type { User } from 'generated/prisma/client.js'

type UserRole = 'ATHLETE' | 'OBSERVER' | 'ADMIN'

interface RegisterUseCaseRequest {
  name: string
  email: string
  password: string
  role: UserRole
}

interface RegisterUseCaseResponse {
  user: User
}

export class RegisterUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    name,
    email,
    password,
    role,
  }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
    const password_hash = await hash(password, 6)

    const userWithSameEmail = await this.usersRepository.findByEmail(email)

    if (userWithSameEmail) {
      throw new EmailAlreadyExistsError()
    }

    const user = await this.usersRepository.create({
      name,
      email,
      password: password_hash,
      role: role || 'ATHLETE',
    })

    return {
      user,
    }
  }
}
