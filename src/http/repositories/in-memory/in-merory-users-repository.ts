import type { User } from 'generated/prisma/client.js'
import type { UsersRepository } from '../users-repository.js'
import type { UserCreateInput } from 'generated/prisma/models.js'

export class InMemoryUsersRepository implements UsersRepository {
  public items: User[] = []

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByEmail(email: string): Promise<User | null> {
    const user = this.items.find((user) => user.email === email)

    if (!user) {
      return null
    }
    return user
  }

  async findById(userId: string): Promise<User | null> {
    const user = this.items.find((user) => user.id === userId)

    if (!user) {
      return null
    }
    return user
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(data: UserCreateInput) {
    const user = {
      id: `user-${this.items.length + 1}`,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role!,
      isActive: true,
      isProfile: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.items.push(user)

    return user
  }

  async updateProfile(userId: string, isProfile: boolean): Promise<User> {
    const userIndex = this.items.findIndex((user) => user.id === userId)

    if (userIndex === -1) {
      throw new Error('User not found')
    }

    const user = this.items[userIndex]!
    user.isProfile = isProfile
    user.updatedAt = new Date()

    return user
  }
}
