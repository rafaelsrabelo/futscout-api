import { hash } from 'bcryptjs'
import type { UsersRepository } from '../repositories/users-repository.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'
import type {
  RegisterUseCaseRequest,
  RegisterUseCaseResponse,
} from './types.js'

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
