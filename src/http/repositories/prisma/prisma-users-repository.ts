import { prisma } from '@/lib/prisma.js'
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

  async findById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
}
