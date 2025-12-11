import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAchievementRepository } from '../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { isUserPremium } from '../utils/check-premium.js'

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

export async function publicGetAthlete(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const getAthleteParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = getAthleteParamsSchema.parse(request.params)

  try {
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const favoriteRepository = new PrismaFavoriteRepository()
    const matchRepository = new PrismaMatchRepository()
    const playRepository = new PrismaPlayRepository()
    const achievementRepository = new PrismaAchievementRepository()

    // Buscar o perfil do atleta pelo ID
    const athleteProfile = await athleteProfileRepository.findById(id)

    if (!athleteProfile) {
      return reply.status(404).send({ message: 'Athlete not found' })
    }

    // Buscar dados em paralelo (sem isFavorite, pois não há usuário autenticado)
    const [favoritesCount, allMatches, videoFeed, isPremium, achievements] = await Promise.all([
      favoriteRepository.countFavoritesByAthlete(id),
      // Buscar todas as partidas do atleta (não apenas FINISHED)
      // Para perfil público, faz sentido mostrar todas as partidas
      matchRepository.findByAthlete(athleteProfile.id),
      // Feed de vídeos do atleta (usar o ID do AthleteProfile)
      playRepository.findVideosByAthleteId(athleteProfile.id),
      // Verificar se o atleta é premium
      isUserPremium(athleteProfile.userId),
      // Buscar achievements do atleta
      achievementRepository.findByAthleteId(athleteProfile.id),
    ])

    // Buscar todos os plays das partidas do atleta para contar goals e assists
    const matchIds = allMatches.map((match) => match.id)
    const allPlays = matchIds.length > 0
      ? await Promise.all(
          matchIds.map((matchId) =>
            playRepository.findManyByMatchId(matchId),
          ),
        ).then((playsArrays) => playsArrays.flat())
      : []

    // Agrupar plays por matchId e contar goals e assists
    const playsByMatch: Record<
      string,
      { goals: number; assists: number }
    > = {}

    for (const play of allPlays) {
      if (!play.matchId) continue

      if (!playsByMatch[play.matchId]) {
        playsByMatch[play.matchId] = { goals: 0, assists: 0 }
      }

      if (play.playType === 'GOAL') {
        playsByMatch[play.matchId].goals++
      } else if (play.playType === 'ASSIST') {
        playsByMatch[play.matchId].assists++
      }
    }

    // Agrupar partidas por competição/amistoso (mesmo formato do list-my-matches)
    const groupedMatches: Record<
      string,
      {
        type: 'competition' | 'friendly'
        competition?: {
          id: string
          name: string
          description: string | null
          startDate: Date | null
          endDate: Date | null
        } | null
        matches: Array<{
          id: string
          adversaryTeam: string
          date: Date
          myTeam: {
            id: string
            name: string
            acronym: string | null
          } | null
          location: string
          category: string
          modality: string
          result: string
          resultFlag: 'win' | 'loss' | 'draw' | 'not_finished'
          myTeamScore: number | null
          adversaryScore: number | null
          performanceRating: number | null
          isFriendly: boolean
          competitionName: string | null
          competition: {
            id: string
            name: string
            description: string | null
            startDate: Date | null
            endDate: Date | null
          } | null
          goals: number
          assists: number
          timeOnField: number | null
          matchDuration: number | null
          playerPosition: 'STARTER' | 'SUBSTITUTE' | null
        }>
      }
    > = {}

    // Separar partidas por competição ou amistoso
    for (const match of allMatches) {
      const matchWithRelations = match as typeof match & {
        myTeam?: {
          id: string
          name: string
          nickname: string | null
          acronym: string
        } | null
        competition?: {
          id: string
          name: string
          description: string | null
          startDate: Date | null
          endDate: Date | null
        } | null
      }
      const competitionId = match.competitionId || null
      const competition = matchWithRelations.competition || null
      const key = competitionId || 'friendly'

      if (!groupedMatches[key]) {
        groupedMatches[key] = {
          type: competitionId ? 'competition' : 'friendly',
          competition: competition
            ? {
                id: competition.id,
                name: competition.name,
                description: competition.description || null,
                startDate: competition.startDate || null,
                endDate: competition.endDate || null,
              }
            : null,
          matches: [],
        }
      }

      // Buscar goals e assists da partida
      const matchStats = playsByMatch[match.id] || { goals: 0, assists: 0 }

      groupedMatches[key].matches.push({
        id: match.id,
        adversaryTeam: match.adversaryTeam,
        date: match.date,
        myTeam: matchWithRelations.myTeam
          ? {
              id: match.myTeamId,
              name: matchWithRelations.myTeam.name,
              acronym: matchWithRelations.myTeam.acronym,
            }
          : null,
        location: match.location,
        category: match.category,
        modality: match.modality,
        result: match.result,
        // Flag de resultado para facilitar uso no frontend
        resultFlag:
          match.result === 'WIN'
            ? 'win'
            : match.result === 'LOSS'
              ? 'loss'
              : match.result === 'DRAW'
                ? 'draw'
                : 'not_finished',
        myTeamScore: match.myTeamScore,
        adversaryScore: match.adversaryScore,
        performanceRating: match.performanceRating,
        isFriendly: !competitionId,
        competitionName: competition?.name || null,
        competition: competition
          ? {
              id: competition.id,
              name: competition.name,
              description: competition.description || null,
              startDate: competition.startDate || null,
              endDate: competition.endDate || null,
            }
          : null,
        // ⭐ Campos de performance adicionados
        goals: matchStats.goals,
        assists: matchStats.assists,
        timeOnField: match.approximateTime ?? null,
        matchDuration: match.matchDuration ?? null,
        playerPosition: match.playerPosition ?? null,
      })
    }

    // Ordenar partidas dentro de cada grupo por data (mais recente primeiro)
    for (const key in groupedMatches) {
      const group = groupedMatches[key]
      if (group) {
        group.matches.sort((a, b) => {
          return b.date.getTime() - a.date.getTime()
        })
      }
    }

    // Converter para array e ordenar: primeiro competições (por nome), depois amistosos
    const groupedArray = Object.values(groupedMatches).sort((a, b) => {
      // Amistosos sempre por último
      if (a.type === 'friendly' && b.type === 'competition') return 1
      if (a.type === 'competition' && b.type === 'friendly') return -1

      // Se ambos são competições, ordenar por nome
      if (a.type === 'competition' && b.type === 'competition') {
        const nameA = a.competition?.name || ''
        const nameB = b.competition?.name || ''
        return nameA.localeCompare(nameB)
      }

      // Se ambos são amistosos, manter ordem original
      return 0
    })

    return reply.status(200).send({
      athlete: {
        ...athleteProfile,
        favorites: favoritesCount,
        isFavorite: false, // Always false for public access
        isPremium,
        achievements: achievements.map((achievement) => ({
          id: achievement.id,
          name: achievement.name,
          category: achievement.category,
          year: achievement.year,
          type: achievement.type,
          createdAt: achievement.createdAt,
          updatedAt: achievement.updatedAt,
        })),
        finishedMatches: groupedArray,
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

