import { prisma } from '@/lib/prisma.js'
import { hash } from 'bcryptjs'

type UserRole = 'ATHLETE' | 'OBSERVER' | 'ADMIN'

interface RegisterUseCaseRequest {
  name: string
  email: string
  password: string
  role: UserRole
}

export async function registerUseCase({
  name,
  email,
  password,
  role,
}: RegisterUseCaseRequest) {
  const password_hash = await hash(password, 6)

  const userWithSameEmail = await prisma.user.findUnique({
    where: { email },
  })

  if (userWithSameEmail) {
    throw new Error('User already exists')
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: password_hash,
      role: role || 'ATHLETE',
    },
  })
}
