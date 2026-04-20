import { compare } from 'bcryptjs'
import type { UsersRepository } from '../repositories/users-repository.js'
import { InvalidCredentialsError } from './errors/invalid-credentials-error.js'
import type {
  AuthenticateUseCaseRequest,
  AuthenticateUseCaseResponse,
} from './types.js'

export class AuthenticateUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    email,
    cpf,
    password,
  }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
    if (!email && !cpf) {
      throw new InvalidCredentialsError()
    }

    const user = cpf
      ? await this.usersRepository.findByCpf(cpf)
      : await this.usersRepository.findByEmail(email!)

    if (!user) {
      throw new InvalidCredentialsError()
    }

    const doesPasswordMatches = await compare(password, user.password)

    if (!doesPasswordMatches) {
      throw new InvalidCredentialsError()
    }

    await this.usersRepository.updateLastLoginAt(user.id)

    return { user }
  }
}
