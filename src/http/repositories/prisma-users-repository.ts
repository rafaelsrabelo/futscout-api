import { prisma } from '@/lib/prisma.js'
import type { UserCreateInput } from 'generated/prisma/models.js'

export class PrismaUsersRepository {
  async create(data: UserCreateInput) {
    const user = await prisma.user.create({
      data,
    })

    return user
  }
}
