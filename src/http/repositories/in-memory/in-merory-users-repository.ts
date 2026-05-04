import type { AuthProvider, User, UserRole } from 'generated/prisma/client.js'
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersFilters,
  AdminUsersPagination,
  UsersRepository,
} from '../users-repository.js'
import type { UserCreateInput } from 'generated/prisma/models.js'

export class InMemoryUsersRepository implements UsersRepository {
  public items: User[] = []
  // Sets opcionais que specs preenchem pra simular relações cross-tabela.
  public athleteProfileUserIds = new Set<string>()
  public observerProfileUserIds = new Set<string>()
  public premiumUserIds = new Set<string>()
  // Mapeia userId → athleteProfileId (opcional, usado por findByIdForAdmin).
  public athleteProfileIdByUser = new Map<string, string>()
  public observerProfileIdByUser = new Map<string, string>()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByEmail(email: string): Promise<User | null> {
    const user = this.items.find((user) => user.email === email)

    if (!user) {
      return null
    }
    return user
  }

  async findByCpf(cpf: string): Promise<User | null> {
    const user = this.items.find((user) => user.cpf === cpf)
    if (!user) return null
    return user
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

  async findManyForAdmin(
    filters: AdminUsersFilters,
    pagination: AdminUsersPagination,
  ): Promise<{ items: User[]; total: number }> {
    let filtered = this.items

    if (filters.role === 'none') {
      filtered = filtered.filter((u) => u.role === null)
    } else if (filters.role) {
      filtered = filtered.filter((u) => u.role === filters.role)
    }

    if (filters.q) {
      const term = filters.q.trim().toLowerCase()
      const cpfDigits = term.replace(/\D/g, '')
      filtered = filtered.filter((u) => {
        const nameHit = u.name.toLowerCase().includes(term)
        const cpfHit = cpfDigits && u.cpf?.includes(cpfDigits)
        return nameHit || cpfHit
      })
    }

    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const start = (pagination.page - 1) * pagination.pageSize
    const paged = sorted.slice(start, start + pagination.pageSize)
    const items: AdminUserListItem[] = paged.map((u) => ({
      ...u,
      hasAthleteProfile: this.athleteProfileUserIds.has(u.id),
      hasObserverProfile: this.observerProfileUserIds.has(u.id),
      activePlan: this.premiumUserIds.has(u.id) ? 'PREMIUM' : 'FREE',
    }))
    return { items, total: filtered.length }
  }

  async findByIdForAdmin(userId: string): Promise<AdminUserDetail | null> {
    const user = this.items.find((u) => u.id === userId)
    if (!user) return null
    return {
      user,
      athleteProfileId: this.athleteProfileIdByUser.get(userId) ?? null,
      observerProfileId: this.observerProfileIdByUser.get(userId) ?? null,
      activePlan: this.premiumUserIds.has(userId) ? 'PREMIUM' : 'FREE',
    }
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
      cpf: data.cpf ?? null,
      password: data.password,
      role: data.role ?? null,
      provider: data.provider ?? 'CREDENTIALS',
      providerId: data.providerId ?? null,
      emailVerified: data.emailVerified ?? false,
      isActive: data.isActive ?? true,
      isProfile: data.isProfile ?? false,
      isImported: data.isImported ?? false,
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
