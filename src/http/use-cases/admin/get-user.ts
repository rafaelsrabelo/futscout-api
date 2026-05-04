import type {
  AdminUserDetail,
  UsersRepository,
} from '../../repositories/users-repository.js'

import { UserNotFoundError } from './errors/user-not-found-error.js'

export interface GetUserAdminUseCaseRequest {
  userId: string
}

export class GetUserAdminUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
  }: GetUserAdminUseCaseRequest): Promise<AdminUserDetail> {
    const detail = await this.usersRepository.findByIdForAdmin(userId)
    if (!detail) throw new UserNotFoundError()
    return detail
  }
}
