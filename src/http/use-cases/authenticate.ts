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
    password,
  }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
    const user = await this.usersRepository.findByEmail(email)
    if (!user) {
      throw new InvalidCredentialsError()
    }

    const doesPasswordMatches = await compare(password, user.password)

    if (!doesPasswordMatches) {
      throw new InvalidCredentialsError()
    }

    return { user }
  }
}
