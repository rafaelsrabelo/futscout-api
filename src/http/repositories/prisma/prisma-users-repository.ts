import { prisma } from '@/lib/prisma.js'
import type { AuthProvider, User } from 'generated/prisma/client.js'
import type { UserCreateInput } from 'generated/prisma/models.js'
import type { UsersRepository } from '../users-repository.js'

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
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { athleteProfile: { cpf } },
          { observerProfile: { cpf } },
        ],
      },
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

  async delete(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    })
  }
}
