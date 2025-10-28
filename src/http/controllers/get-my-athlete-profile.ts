import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function getMyAthleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.sub

    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const athleteProfile = await athleteProfileRepository.findByUserId(userId)

    if (!athleteProfile) {
      return reply.status(404).send({
        message: 'Athlete profile not found. Please create your profile first.',
      })
    }

    return reply.status(200).send({
      athleteProfile: {
        id: athleteProfile.id,
        cpf: athleteProfile.cpf,
        gender: athleteProfile.gender,
        nickname: athleteProfile.nickname,
        profilePhoto: athleteProfile.profilePhoto,
        birthDate: athleteProfile.birthDate,
        instagramUrl: athleteProfile.instagramUrl,
        twitterUrl: athleteProfile.twitterUrl,
        height: athleteProfile.height,
        weight: athleteProfile.weight,
        dominantFoot: athleteProfile.dominantFoot,
        primaryPosition: athleteProfile.primaryPosition,
        secondaryPosition: athleteProfile.secondaryPosition,
        currentClub: athleteProfile.currentClub,
        biography: athleteProfile.biography,
        hasManager: athleteProfile.hasManager,
        managerName: athleteProfile.managerName,
        managerCompany: athleteProfile.managerCompany,
        managerContact: athleteProfile.managerContact,
        createdAt: athleteProfile.createdAt,
        updatedAt: athleteProfile.updatedAt,
        user: athleteProfile.user,
        address: athleteProfile.address,
      },
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
