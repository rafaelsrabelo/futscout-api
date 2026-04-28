import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@/lib/prisma.js'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { GetProfileUseCase } from '../use-cases/get-profile.js'

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const getProfileUseCase = new GetProfileUseCase(prismaUsersRepository)

    const { user } = await getProfileUseCase.execute({ userId })

    // isProfile é derivado da realidade do AthleteProfile/ObserverProfile, não da
    // flag em users.isProfile (que pode estar desatualizada — atletas importados
    // são criados com perfil esqueleto). Regra: perfil "completo" exige todos os
    // 6 campos obrigatórios pra ATHLETE; pra OBSERVER, basta existir.
    let isProfile = user.isProfile
    if (user.role === 'ATHLETE') {
      const athleteProfile = await prisma.athleteProfile.findUnique({
        where: { userId: user.id },
        select: {
          birthDate: true,
          gender: true,
          primaryPosition: true,
          height: true,
          weight: true,
          dominantFoot: true,
        },
      })
      isProfile = !!(
        athleteProfile &&
        athleteProfile.birthDate !== null &&
        athleteProfile.gender !== null &&
        athleteProfile.primaryPosition !== null &&
        athleteProfile.height !== null &&
        athleteProfile.weight !== null &&
        athleteProfile.dominantFoot !== null
      )
    } else if (user.role === 'OBSERVER') {
      const observerProfile = await prisma.observerProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
      isProfile = !!observerProfile
    }

    return reply.status(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isProfile,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    return reply.status(404).send({ message: 'User not found' })
  }
}
