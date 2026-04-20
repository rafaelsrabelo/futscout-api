import type { AuthProvider, User, UserRole } from 'generated/prisma/client.js'
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByCpf(_cpf: string): Promise<User | null> {
    return null
  }

  async findById(userId: string): Promise<User | null> {
    const user = this.items.find((user) => user.id === userId)

    if (!user) {
      return null
    }
    return user
  }

  async findFirstByRole(role: UserRole): Promise<User | null> {
    const user = this.items.find((user) => user.role === role)

    if (!user) {
      return null
    }
    return user
  }

  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    const user = this.items.find(
      (user) => user.provider === provider && user.providerId === providerId,
    )

    if (!user) {
      return null
    }
    return user
  }

  async update(userId: string, data: Partial<User>): Promise<User> {
    const userIndex = this.items.findIndex((user) => user.id === userId)

    if (userIndex === -1) {
      throw new Error('User not found')
    }

    const user = this.items[userIndex]!
    Object.assign(user, data, { updatedAt: new Date() })

    return user
  }

  async delete(userId: string): Promise<void> {
    const userIndex = this.items.findIndex((user) => user.id === userId)

    if (userIndex === -1) {
      return
    }

    this.items.splice(userIndex, 1)
  }

  async create(data: UserCreateInput): Promise<User> {
    const user: User = {
      id: `user-${this.items.length + 1}`,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role ?? null,
      provider: data.provider ?? 'CREDENTIALS',
      providerId: data.providerId ?? null,
      emailVerified: data.emailVerified ?? false,
      isActive: data.isActive ?? true,
      isProfile: data.isProfile ?? false,
      stripeCustomerId: data.stripeCustomerId ?? null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.items.push(user)

    return user
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    const user = this.items.find((u) => u.id === userId)
    if (!user) return
    user.lastLoginAt = new Date()
    user.updatedAt = new Date()
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

  async updateUserActiveStatus(
    userId: string,
    isActive: boolean,
  ): Promise<User> {
    const userIndex = this.items.findIndex((user) => user.id === userId)

    if (userIndex === -1) {
      throw new Error('User not found')
    }

    const user = this.items[userIndex]!
    user.isActive = isActive
    user.updatedAt = new Date()

    return user
  }
}
