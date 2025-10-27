import { hash } from 'bcryptjs'
import type { UsersRepository } from '../repositories/users-repository.js'

type UserRole = 'ATHLETE' | 'OBSERVER' | 'ADMIN'

interface RegisterUseCaseRequest {
  name: string
  email: string
  password: string
  role: UserRole
}

export class RegisterUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({ name, email, password, role }: RegisterUseCaseRequest) {
    const password_hash = await hash(password, 6)

    const userWithSameEmail = await this.usersRepository.findByEmail(email)

    if (userWithSameEmail) {
      throw new Error('User already exists')
    }

    await this.usersRepository.create({
      name,
      email,
      password: password_hash,
      role: role || 'ATHLETE',
    })
  }
}
