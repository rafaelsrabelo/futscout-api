import type {
  AdminAthleteFilters,
  AthleteProfileRepository,
} from '../../repositories/athlete-profile-repository.js'

export interface ListAthletesAdminUseCaseRequest extends AdminAthleteFilters {
  page?: number
  pageSize?: number
}

export interface AdminAthleteListItem {
  id: string | null
  userId: string
  hasProfile: boolean
  nickname: string | null
  profilePhoto: string | null
  birthDate: Date | null
  age: number | null
  gender: string | null
  primaryPosition: string | null
  secondaryPosition: string | null
  dominantFoot: string | null
  currentClub: string | null
  height: number | null
  weight: number | null
  hasManager: boolean
  cpf: string | null
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    isActive: boolean
    createdAt: Date
    lastLoginAt: Date | null
  }
}

export interface ListAthletesAdminUseCaseResponse {
  items: AdminAthleteListItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

function computeAge(
  birthDate: Date | null,
  referenceDate: Date = new Date(),
): number | null {
  if (!birthDate) return null
  let age = referenceDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth()
  const hasNotHadBirthdayThisYear =
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())

  if (hasNotHadBirthdayThisYear) {
    age -= 1
  }

  return age
}

export class ListAthletesAdminUseCase {
  constructor(private athleteProfileRepository: AthleteProfileRepository) {}

  async execute(
    request: ListAthletesAdminUseCaseRequest,
  ): Promise<ListAthletesAdminUseCaseResponse> {
    const { page = 1, pageSize = 20, ...filters } = request

    const { items, total } =
      await this.athleteProfileRepository.findManyForAdmin(filters, {
        page,
        pageSize,
      })

    const mapped: AdminAthleteListItem[] = items.map(({ profile, user }) => ({
      id: profile?.id ?? null,
      userId: user.id,
      hasProfile: profile !== null,
      nickname: profile?.nickname ?? null,
      profilePhoto: profile?.profilePhoto ?? null,
      birthDate: profile?.birthDate ?? null,
      age: computeAge(profile?.birthDate ?? null),
      gender: profile?.gender ?? null,
      primaryPosition: profile?.primaryPosition ?? null,
      secondaryPosition: profile?.secondaryPosition ?? null,
      dominantFoot: profile?.dominantFoot ?? null,
      currentClub: profile?.currentClub ?? null,
      height: profile?.height ?? null,
      weight: profile?.weight ?? null,
      hasManager: profile?.hasManager ?? false,
      cpf: user.cpf,
      // Para incompletos, usa o createdAt do User (quando se cadastrou).
      createdAt: profile?.createdAt ?? user.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    }))

    return {
      items: mapped,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    }
  }
}
