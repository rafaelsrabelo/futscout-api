import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'

type MatchData = {
  id: string
  adversaryTeam: string
  date: Date
  location: string
  category: string
  modality: string
  result: string
  myTeamScore: number | null
  adversaryScore: number | null
  performanceRating: number | null
  competitionId?: string | null
  competition?: {
    id: string
    name: string
    description: string | null
    startDate: Date | null
    endDate: Date | null
  } | null
  myTeam?: {
    id: string
    name: string
    nickname: string | null
    acronym: string
  } | null
}

type PlayData = {
  id: string
  playType: string
  videoUrl?: string | null
  thumbnailUrl?: string | null
  createdAt: Date
  classifications?: Array<{
    id: string
    playId: string
    classification: string
    createdAt: Date
  }>
  match?: {
    id: string
    adversaryTeam: string
    date: Date
    category: string
  }
}

export async function getAthlete(request: FastifyRequest, reply: FastifyReply) {
  const getAthleteParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = getAthleteParamsSchema.parse(request.params)

  try {
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const favoriteRepository = new PrismaFavoriteRepository()
    const matchRepository = new PrismaMatchRepository()
    const playRepository = new PrismaPlayRepository()

    // Buscar o perfil do atleta pelo ID
    const athleteProfile = await athleteProfileRepository.findById(id)

    if (!athleteProfile) {
      return reply.status(404).send({ message: 'Athlete not found' })
    }

    const userId = request.user.sub

    // Buscar dados em paralelo
    const [favoritesCount, isFavorite, finishedMatches, videoFeed] =
      await Promise.all([
        favoriteRepository.countFavoritesByAthlete(id),
        favoriteRepository.isFavorite(userId, id),
        // Partidas finalizadas do atleta (usar o ID do AthleteProfile)
        matchRepository.findByAthleteIdAndStatus(athleteProfile.id, 'FINISHED'),
        // Feed de vídeos do atleta (usar o ID do AthleteProfile)
        playRepository.findVideosByAthleteId(athleteProfile.id),
      ])

    return reply.status(200).send({
      athlete: {
        ...athleteProfile,
        favorites: favoritesCount,
        isFavorite,
        finishedMatches: finishedMatches.map((match: MatchData) => ({
          id: match.id,
          adversaryTeam: match.adversaryTeam,
          date: match.date,
          myTeam: match.myTeam
            ? {
                id: match.myTeam.id,
                name: match.myTeam.name,
                nickname: match.myTeam.nickname,
                acronym: match.myTeam.acronym,
              }
            : null,
          location: match.location,
          category: match.category,
          modality: match.modality,
          result: match.result,
          myTeamScore: match.myTeamScore,
          adversaryScore: match.adversaryScore,
          performanceRating: match.performanceRating,
          isFriendly: !match.competitionId,
          competitionName: match.competition?.name || null,
          competition: match.competition
            ? {
                id: match.competition.id,
                name: match.competition.name,
                description: match.competition.description,
                startDate: match.competition.startDate,
                endDate: match.competition.endDate,
              }
            : null,
        })),
        videoFeed: videoFeed.map((play: PlayData) => ({
          id: play.id,
          type: play.playType,
          videoUrl: play.videoUrl,
          thumbnailUrl: play.thumbnailUrl,
          classifications: play.classifications || [],
          match: play.match
            ? {
                id: play.match.id,
                adversaryTeam: play.match.adversaryTeam,
                date: play.match.date,
                category: play.match.category,
              }
            : null,
          createdAt: play.createdAt,
        })),
      },
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
