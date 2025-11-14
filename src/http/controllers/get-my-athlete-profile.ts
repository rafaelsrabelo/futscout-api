import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { GetMyAthleteProfileUseCase } from '../use-cases/get-my-athlete-profile.js'

export async function getMyAthleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.sub

    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const favoriteRepository = new PrismaFavoriteRepository()
    const getMyAthleteProfileUseCase = new GetMyAthleteProfileUseCase(
      athleteProfileRepository,
    )

    const { profile } = await getMyAthleteProfileUseCase.execute({ userId })

    // Count how many users favorited this athlete
    const favoritesCount = await favoriteRepository.countFavoritesByAthlete(
      profile.id,
    )

    return reply.status(200).send({
      athleteProfile: {
        id: profile.id,
        cpf: profile.cpf,
        gender: profile.gender,
        nickname: profile.nickname,
        profilePhoto: profile.profilePhoto,
        birthDate: profile.birthDate,
        instagramUrl: profile.instagramUrl,
        twitterUrl: profile.twitterUrl,
        height: profile.height,
        weight: profile.weight,
        dominantFoot: profile.dominantFoot,
        primaryPosition: profile.primaryPosition,
        secondaryPosition: profile.secondaryPosition,
        currentClub: profile.currentClub,
        biography: profile.biography,
        hasManager: profile.hasManager,
        managerName: profile.managerName,
        managerCompany: profile.managerCompany,
        managerContact: profile.managerContact,
        hasNutritionist: profile.hasNutritionist,
        hasPsychologist: profile.hasPsychologist,
        hasPersonalTrainer: profile.hasPersonalTrainer,
        address: profile.address,
        favorites: favoritesCount,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Athlete profile not found'
    ) {
      return reply.status(404).send({
        message: 'Athlete profile not found. Please create your profile first.',
      })
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
