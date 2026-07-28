import { z } from 'zod'
import type {
  AthleteFilters,
  AthleteProfileRepository,
  AthleteProfileWithUser,
} from '../../../repositories/athlete-profile-repository.js'
import type { AthleteCard, ScoutTool, ScoutToolResult } from './tool-types.js'

const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'] as const

// Fronteira de confiança: o modelo produz estes argumentos, então nada passa
// daqui sem validação. Chaves desconhecidas são descartadas pelo Zod.
const argsSchema = z.object({
  primaryPosition: z.enum(POSITIONS).optional(),
  secondaryPosition: z.enum(POSITIONS).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
  classification: z.enum(['DESENVOLVIMENTO', 'PERFORMANCE']).optional(),
  minAge: z.number().int().min(0).max(60).optional(),
  maxAge: z.number().int().min(0).max(60).optional(),
  minHeight: z.number().min(0.5).max(2.5).optional(),
  maxHeight: z.number().min(0.5).max(2.5).optional(),
  minWeight: z.number().min(10).max(200).optional(),
  maxWeight: z.number().min(10).max(200).optional(),
  currentClub: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
  nickname: z.string().max(50).optional(),
  hasManager: z.boolean().optional(),
  limit: z.number().int().min(1).max(20).optional(),
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

function toCard(athlete: AthleteProfileWithUser): AthleteCard {
  return {
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
}

/**
 * Busca atletas a partir dos critérios que a IA extraiu da conversa.
 * É o substituto direto do formulário de filtros do observador.
 */
export class SearchAthletesTool implements ScoutTool {
  readonly name = 'search_athletes'
  readonly description =
    'Busca atletas na base pelos critérios extraídos da conversa. Use quando ' +
    'houver pelo menos um critério objetivo (posição, idade, pé dominante, ' +
    'altura, clube...). Devolve os atletas encontrados e o total. Não chame ' +
    'com pedido vago — pergunte antes.'

  constructor(private athleteProfileRepository: AthleteProfileRepository) {}

  // Não recebe `ctx`: a busca não é escopada por usuário — todo observador vê
  // a mesma base de atletas.
  async execute(args: Record<string, unknown>): Promise<ScoutToolResult> {
    const parsed = argsSchema.parse(args)
    const { limit = 10, ...criteria } = parsed

    // Faixas invertidas ("entre 20 e 16 anos") viram erro de conversa, não
    // resultado vazio silencioso.
    if (
      criteria.minAge !== undefined &&
      criteria.maxAge !== undefined &&
      criteria.minAge > criteria.maxAge
    ) {
      return {
        data: { error: 'INVALID_RANGE', field: 'age' },
        summary: 'Faixa de idade invertida: minAge é maior que maxAge.',
      }
    }

    // Sem nenhum critério a busca devolveria a base inteira — recusa e
    // devolve o controle para o modelo perguntar.
    if (Object.keys(criteria).length === 0) {
      return {
        data: { error: 'NO_CRITERIA' },
        summary: 'Nenhum critério informado. Pergunte ao observador.',
      }
    }

    const filters: AthleteFilters = { ...criteria, page: 1, limit }

    const [athletes, total] = await Promise.all([
      this.athleteProfileRepository.findMany(filters),
      this.athleteProfileRepository.countMany(criteria),
    ])

    const cards = athletes.map(toCard)

    // Lista enxuta para o modelo: só o que ele precisa para comentar o
    // resultado. Os dados ricos vão para o app pelos cards.
    return {
      data: {
        total,
        returned: cards.length,
        athletes: cards.map((c) => ({
          // O modelo repassa este id ao get_athlete_details. Se vazar para o
          // texto, o scrub de UUID no serviço de LLM remove.
          athleteId: c.id,
          nickname: c.nickname ?? c.name,
          position: c.primaryPosition,
          age: c.age,
          club: c.currentClub,
        })),
      },
      summary:
        total === 0
          ? 'Nenhum atleta encontrado com esses critérios.'
          : `${total} atleta(s) encontrado(s), mostrando ${cards.length}.`,
      cards,
      appliedFilters: criteria,
    }
  }
}
