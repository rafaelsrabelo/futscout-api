import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { Match } from '../../../generated/prisma/client.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { ListMyMatchesUseCase } from '../use-cases/list-my-matches.js'

export async function listMyMatches(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const listMyMatchesQuerySchema = z.object({
    includePlays: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    status: z
      .enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED', 'ALL'])
      .optional()
      .default('ALL'),
  })

  const { includePlays, status } = listMyMatchesQuerySchema.parse(request.query)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const listMyMatchesUseCase = new ListMyMatchesUseCase(
    matchRepository,
    athleteProfileRepository,
  )

    const matches = await listMyMatchesUseCase.execute({
      userId: request.user.sub,
      includePlays,
      status,
    })

    // Agrupar partidas por competição/amistoso e depois por data
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
        matches: typeof matches
      }
    > = {}

    // Separar partidas por competição ou amistoso
    for (const match of matches) {
      // Acessar propriedades que podem estar presentes no objeto retornado pelo Prisma
      const matchWithCompetition = match as Match & {
        competitionId?: string | null
        competition?: {
          id: string
          name: string
          description: string | null
          startDate: Date | null
          endDate: Date | null
        } | null
      }
      
      const competitionId = matchWithCompetition.competitionId || null
      const competition = matchWithCompetition.competition || null
      
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

      // Adicionar informações de competição/amistoso em cada partida
      const matchWithInfo = match as Match & {
        competitionId?: string | null
        competition?: {
          id: string
          name: string
          description: string | null
          startDate: Date | null
          endDate: Date | null
        } | null
        isFriendly?: boolean
        competitionName?: string | null
      }

      // Adicionar campos auxiliares para facilitar o uso no frontend
      const enrichedMatch = {
        ...matchWithInfo,
        isFriendly: !competitionId,
        competitionName: competition?.name || null,
        // Flag de resultado para facilitar uso no frontend
        resultFlag: matchWithInfo.result === 'WIN' ? 'win' : 
                    matchWithInfo.result === 'LOSS' ? 'loss' : 
                    matchWithInfo.result === 'DRAW' ? 'draw' : 
                    'not_finished',
      }

      groupedMatches[key].matches.push(enrichedMatch)
    }

    // Ordenar partidas dentro de cada grupo por data (mais recente primeiro)
    for (const key in groupedMatches) {
      groupedMatches[key].matches.sort((a, b) => {
        return b.date.getTime() - a.date.getTime()
      })
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

    return reply.send({
      matches: groupedArray,
      total: matches.length,
    })
}
