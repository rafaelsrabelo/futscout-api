import type { SavedSearchRepository } from '../repositories/saved-search-repository.js'
import type {
  AthleteFilters,
  AthleteProfileRepository,
} from '../repositories/athlete-profile-repository.js'

interface ExecuteSavedSearchRequest {
  savedSearchId: string
  userId: string
  page?: number
  limit?: number
}

interface ExecuteSavedSearchResponse {
  athletes: Array<{
    id: string
    userId: string
    // Todos anuláveis: o perfil do atleta pode estar incompleto, e a importação
    // em massa cria perfis só com nome. O app precisa tratar o null.
    gender: string | null
    nickname?: string | null
    profilePhoto?: string | null
    height: number | null
    weight: number | null
    dominantFoot: string | null
    primaryPosition: string | null
    secondaryPosition?: string | null
    classification?: string | null
    /** Derivada de birthDate — não existe coluna de idade. */
    age: number | null
    currentClub?: string | null
    hasManager: boolean
    user: {
      id: string
      name: string
      role: string | null
      isActive: boolean
    }
    createdAt: Date
  }>
  totalCount: number
  searchTitle: string
}

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

export class ExecuteSavedSearchUseCase {
  constructor(
    private savedSearchRepository: SavedSearchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    savedSearchId,
    userId,
    page = 1,
    limit = 20,
  }: ExecuteSavedSearchRequest): Promise<ExecuteSavedSearchResponse> {
    // Buscar o filtro salvo
    const savedSearch = await this.savedSearchRepository.findById(savedSearchId)

    if (!savedSearch) {
      throw new Error('Saved search not found')
    }

    // Verificar se pertence ao usuário
    if (savedSearch.userId !== userId) {
      throw new Error('Unauthorized access to saved search')
    }

    // Converter os filtros JSON para o formato esperado
    const savedFilters = savedSearch.filters as Record<string, unknown>
    const filters = {
      ...savedFilters,
      page,
      limit,
    }

    // Executar a busca e contar o total em paralelo
    const [athletes, total] = await Promise.all([
      this.athleteProfileRepository.findMany(filters),
      this.athleteProfileRepository.countMany(savedFilters as AthleteFilters),
    ])

    return {
      athletes: athletes.map((athlete) => ({
        id: athlete.id,
        userId: athlete.userId,
        gender: athlete.gender,
        nickname: athlete.nickname,
        profilePhoto: athlete.profilePhoto,
        height: athlete.height,
        weight: athlete.weight,
        dominantFoot: athlete.dominantFoot,
        primaryPosition: athlete.primaryPosition,
        secondaryPosition: athlete.secondaryPosition,
        classification: athlete.classification,
        age: calculateAge(athlete.birthDate),
        currentClub: athlete.currentClub,
        hasManager: athlete.hasManager,
        user: {
          id: athlete.user.id,
          name: athlete.user.name,
          role: athlete.user.role,
          isActive: athlete.user.isActive,
        },
        createdAt: athlete.createdAt,
      })),
      totalCount: total,
      searchTitle: savedSearch.title,
    }
  }
}
