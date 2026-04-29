import type {
  AdminAthleteFilters,
  AthleteProfileRepository,
} from '../../repositories/athlete-profile-repository.js'

export interface ListAthletesAdminUseCaseRequest extends AdminAthleteFilters {
  page?: number
  pageSize?: number
}

export interface AdminAthleteListItem {
  id: string
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

    const mapped: AdminAthleteListItem[] = items.map((profile) => ({
      id: profile.id,
      nickname: profile.nickname,
      profilePhoto: profile.profilePhoto,
      birthDate: profile.birthDate,
      age: computeAge(profile.birthDate),
      gender: profile.gender,
      primaryPosition: profile.primaryPosition,
      secondaryPosition: profile.secondaryPosition,
      dominantFoot: profile.dominantFoot,
      currentClub: profile.currentClub,
      height: profile.height,
      weight: profile.weight,
      hasManager: profile.hasManager,
      cpf: profile.user.cpf,
      createdAt: profile.createdAt,
      user: {
        id: profile.user.id,
        name: profile.user.name,
        email: profile.user.email,
        emailVerified: profile.user.emailVerified,
        isActive: profile.user.isActive,
        createdAt: profile.user.createdAt,
        // lastLoginAt will be wired up once BE-16 adds the column.
        lastLoginAt: null,
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
