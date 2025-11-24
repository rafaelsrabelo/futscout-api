import type { AuthProvider, User } from 'generated/prisma/client.js'
import type { UserCreateInput } from 'generated/prisma/models.js'

export interface UsersRepository {
  create(data: UserCreateInput): Promise<User>
  findByEmail(email: string): Promise<User | null>
  findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null>
  findById(userId: string): Promise<User | null>
  update(userId: string, data: Partial<User>): Promise<User>
  updateProfile(userId: string, isProfile: boolean): Promise<User>
  updateUserActiveStatus(userId: string, isActive: boolean): Promise<User>
  delete(userId: string): Promise<void>
}
