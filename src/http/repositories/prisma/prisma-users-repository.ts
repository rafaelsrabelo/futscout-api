import { prisma } from '@/lib/prisma.js'
import type { AuthProvider, User, UserRole } from 'generated/prisma/client.js'
import type { UserCreateInput } from 'generated/prisma/models.js'
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersFilters,
  AdminUsersPagination,
  UsersRepository,
} from '../users-repository.js'

export class PrismaUsersRepository implements UsersRepository {
  async create(data: UserCreateInput) {
    const user = await prisma.user.create({
      data,
    })

    return user
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    return user
  }

  async findByCpf(cpf: string) {
    const user = await prisma.user.findUnique({
      where: { cpf },
    })

    return user
  }

  async findByProvider(provider: AuthProvider, providerId: string) {
    const user = await prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    })

    return user
  }

  async findById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    return user
  }

  async findFirstByRole(role: UserRole) {
    const user = await prisma.user.findFirst({
      where: { role },
    })

    return user
  }

  async findManyForAdmin(
    filters: AdminUsersFilters,
    pagination: AdminUsersPagination,
  ): Promise<{ items: AdminUserListItem[]; total: number }> {
    const { page, pageSize } = pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    if (filters.role === 'none') {
      where.role = null
    } else if (filters.role) {
      where.role = filters.role
    }

    if (filters.q) {
      const term = filters.q.trim()
      // CPF é só dígitos no banco; se a busca contém só dígitos vira CPF puro.
      const cpfDigits = term.replace(/\D/g, '')
      const ors: Array<Record<string, unknown>> = [
        { name: { contains: term, mode: 'insensitive' } },
      ]
      if (cpfDigits.length > 0) {
        ors.push({ cpf: { contains: cpfDigits } })
      }
      where.OR = ors
    }

    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          athleteProfile: { select: { id: true } },
          observerProfile: { select: { id: true } },
          subscriptions: {
            where: {
              status: 'active',
              currentPeriodEnd: { gte: new Date() },
            },
            select: { plan: { select: { name: true } } },
            take: 1,
            orderBy: { currentPeriodEnd: 'desc' },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    const items: AdminUserListItem[] = rows.map((row) => {
      const { athleteProfile, observerProfile, subscriptions, ...user } = row
      const sub = subscriptions[0]
      return {
        ...user,
        hasAthleteProfile: !!athleteProfile,
        hasObserverProfile: !!observerProfile,
        activePlan: sub?.plan.name === 'PREMIUM' ? 'PREMIUM' : 'FREE',
      }
    })

    return { items, total }
  }

  async findByIdForAdmin(userId: string): Promise<AdminUserDetail | null> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        athleteProfile: { select: { id: true } },
        observerProfile: { select: { id: true } },
        subscriptions: {
          where: {
            status: 'active',
            currentPeriodEnd: { gte: new Date() },
          },
          select: { plan: { select: { name: true } } },
          take: 1,
          orderBy: { currentPeriodEnd: 'desc' },
        },
      },
    })

    if (!row) return null

    const { athleteProfile, observerProfile, subscriptions, ...user } = row
    const sub = subscriptions[0]
    return {
      user,
      athleteProfileId: athleteProfile?.id ?? null,
      observerProfileId: observerProfile?.id ?? null,
      activePlan: sub?.plan.name === 'PREMIUM' ? 'PREMIUM' : 'FREE',
    }
  }

  async update(userId: string, data: Partial<User>) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })

    return user
  }

  async updateProfile(userId: string, isProfile: boolean) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isProfile },
    })

    return user
  }

  async updateUserActiveStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    })

    return user
  }

  async updateLastLoginAt(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
  }

  async delete(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    })
  }
}
