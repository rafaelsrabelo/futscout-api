import { z } from 'zod'
import type { AthleteProfileRepository } from '../../../repositories/athlete-profile-repository.js'
import { sanitizeForModel } from './sanitize-for-model.js'
import type { AthleteCard, ScoutTool, ScoutToolResult } from './tool-types.js'

const argsSchema = z.object({
  athleteId: z.string().uuid(),
})

function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }
  return age
}

/**
 * Detalha um atleta já devolvido por search_athletes, quando o observador
 * pergunta sobre um jogador específico da lista.
 */
export class GetAthleteDetailsTool implements ScoutTool {
  readonly name = 'get_athlete_details'
  readonly description =
    'Detalha um atleta específico usando o athleteId devolvido por ' +
    'search_athletes. Use quando o observador perguntar sobre um jogador da ' +
    'lista (biografia, empresário, medidas).'

  readonly parameters = {
    type: 'object',
    additionalProperties: false,
    required: ['athleteId'],
    properties: {
      athleteId: {
        type: 'string',
        description: 'O athleteId exato devolvido por search_athletes.',
      },
    },
  }

  constructor(private athleteProfileRepository: AthleteProfileRepository) {}

  // Não recebe `ctx`: o perfil do atleta é público para qualquer observador.
  async execute(args: Record<string, unknown>): Promise<ScoutToolResult> {
    const { athleteId } = argsSchema.parse(args)

    const athlete = await this.athleteProfileRepository.findById(athleteId)

    if (!athlete) {
      return {
        data: { error: 'NOT_FOUND' },
        summary: 'Atleta não encontrado.',
      }
    }

    const card: AthleteCard = {
      id: athlete.id,
      userId: athlete.userId,
      name: athlete.user.name,
      nickname: athlete.nickname,
      profilePhoto: athlete.profilePhoto,
      primaryPosition: athlete.primaryPosition,
      secondaryPosition: athlete.secondaryPosition,
      age: calculateAge(athlete.birthDate),
      height: athlete.height,
      weight: athlete.weight,
      dominantFoot: athlete.dominantFoot,
      currentClub: athlete.currentClub,
    }

    // Só métricas. A `biography` NÃO vai ao modelo: é texto narrativo escrito
    // pelo próprio atleta, não serve de critério de busca, e é o vetor mais
    // largo de injeção de prompt num produto onde aparecer melhor na busca do
    // olheiro é o incentivo. Quem quiser ler a bio abre o perfil do atleta.
    return {
      data: {
        athlete: {
          nickname: sanitizeForModel(card.nickname ?? card.name),
          position: card.primaryPosition,
          secondaryPosition: card.secondaryPosition,
          age: card.age,
          height: card.height,
          weight: card.weight,
          dominantFoot: card.dominantFoot,
          club: sanitizeForModel(card.currentClub),
          hasManager: athlete.hasManager,
        },
      },
      summary: `Detalhes de ${card.nickname ?? card.name}.`,
      cards: [card],
    }
  }
}
