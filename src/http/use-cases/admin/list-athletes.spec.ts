import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { ListAthletesAdminUseCase } from './list-athletes.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: ListAthletesAdminUseCase

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? `user-${Math.random()}`,
    email: overrides.email ?? `user-${Math.random()}@example.com`,
    name: overrides.name ?? 'Some User',
    password: overrides.password ?? 'hashed',
    role: overrides.role ?? 'ATHLETE',
    provider: overrides.provider ?? 'CREDENTIALS',
    providerId: overrides.providerId ?? null,
    emailVerified: overrides.emailVerified ?? true,
    isActive: overrides.isActive ?? true,
    isProfile: overrides.isProfile ?? true,
    stripeCustomerId: overrides.stripeCustomerId ?? null,
    lastLoginAt: overrides.lastLoginAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  }
}

function makeProfile(
  userId: string,
  overrides: Partial<AthleteProfile> = {},
): AthleteProfile {
  return {
    id: overrides.id ?? `profile-${Math.random()}`,
    userId,
    cpf: overrides.cpf ?? '00000000000',
    gender: overrides.gender ?? 'MALE',
    nickname: overrides.nickname ?? null,
    profilePhoto: overrides.profilePhoto ?? null,
    birthDate: overrides.birthDate ?? new Date('2005-06-15'),
    instagramUrl: overrides.instagramUrl ?? null,
    twitterUrl: overrides.twitterUrl ?? null,
    youtubeUrl: overrides.youtubeUrl ?? null,
    height: overrides.height ?? 1.8,
    weight: overrides.weight ?? 75,
    dominantFoot: overrides.dominantFoot ?? 'RIGHT',
    primaryPosition: overrides.primaryPosition ?? 'MIDFIELDER',
    secondaryPosition: overrides.secondaryPosition ?? null,
    currentClub: overrides.currentClub ?? null,
    biography: overrides.biography ?? null,
    hasManager: overrides.hasManager ?? false,
    managerName: overrides.managerName ?? null,
    managerCompany: overrides.managerCompany ?? null,
    managerContact: overrides.managerContact ?? null,
    hasNutritionist: overrides.hasNutritionist ?? false,
    hasPsychologist: overrides.hasPsychologist ?? false,
    hasPersonalTrainer: overrides.hasPersonalTrainer ?? false,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  }
}

function seed(
  repo: InMemoryAthleteProfileRepository,
  user: User,
  profile: AthleteProfile,
) {
  repo.addUser(user)
  repo.items.push(profile)
}

beforeEach(() => {
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new ListAthletesAdminUseCase(athleteProfileRepository)
})

describe('List Athletes Admin Use Case', () => {
  it('returns paginated athletes with admin fields and computed age', async () => {
    const user = makeUser({
      id: 'user-1',
      name: 'Rafael Rabelo',
      email: 'rafa@example.com',
    })
    const profile = makeProfile(user.id, {
      id: 'profile-1',
      nickname: 'Rafa',
      birthDate: new Date('2005-06-15'),
      primaryPosition: 'FORWARD',
    })
    seed(athleteProfileRepository, user, profile)

    const result = await sut.execute({ page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.hasMore).toBe(false)
    expect(result.items).toHaveLength(1)

    const [item] = result.items
    expect(item?.id).toBe('profile-1')
    expect(item?.nickname).toBe('Rafa')
    expect(item?.primaryPosition).toBe('FORWARD')
    expect(item?.age).toBeGreaterThan(0)
    expect(item?.user.email).toBe('rafa@example.com')
  })

  it('filters by q matching name, nickname or email (case-insensitive)', async () => {
    seed(
      athleteProfileRepository,
      makeUser({ id: 'u1', name: 'Alice Silva', email: 'alice@x.com' }),
      makeProfile('u1', { id: 'p1', nickname: null }),
    )
    seed(
      athleteProfileRepository,
      makeUser({ id: 'u2', name: 'Bruno Souza', email: 'bruno@x.com' }),
      makeProfile('u2', { id: 'p2', nickname: 'BS' }),
    )

    const byName = await sut.execute({ q: 'alice' })
    expect(byName.items.map((i) => i.id)).toEqual(['p1'])

    const byNickname = await sut.execute({ q: 'bs' })
    expect(byNickname.items.map((i) => i.id)).toEqual(['p2'])

    const byEmail = await sut.execute({ q: 'BRUNO@X' })
    expect(byEmail.items.map((i) => i.id)).toEqual(['p2'])
  })

  it('filters by primaryPosition and dominantFoot', async () => {
    seed(
      athleteProfileRepository,
      makeUser({ id: 'u1' }),
      makeProfile('u1', {
        id: 'p1',
        primaryPosition: 'GOALKEEPER',
        dominantFoot: 'RIGHT',
      }),
    )
    seed(
      athleteProfileRepository,
      makeUser({ id: 'u2' }),
      makeProfile('u2', {
        id: 'p2',
        primaryPosition: 'FORWARD',
        dominantFoot: 'LEFT',
      }),
    )

    const forwards = await sut.execute({ primaryPosition: 'FORWARD' })
    expect(forwards.items.map((i) => i.id)).toEqual(['p2'])

    const lefties = await sut.execute({ dominantFoot: 'LEFT' })
    expect(lefties.items.map((i) => i.id)).toEqual(['p2'])
  })

  it('filters by age range (minAge / maxAge)', async () => {
    const today = new Date()

    const bornTenYearsAgo = new Date(today)
    bornTenYearsAgo.setFullYear(today.getFullYear() - 10)
    const bornTwentyYearsAgo = new Date(today)
    bornTwentyYearsAgo.setFullYear(today.getFullYear() - 20)
    const bornThirtyYearsAgo = new Date(today)
    bornThirtyYearsAgo.setFullYear(today.getFullYear() - 30)

    seed(
      athleteProfileRepository,
      makeUser({ id: 'u10' }),
      makeProfile('u10', { id: 'p10', birthDate: bornTenYearsAgo }),
    )
    seed(
      athleteProfileRepository,
      makeUser({ id: 'u20' }),
      makeProfile('u20', { id: 'p20', birthDate: bornTwentyYearsAgo }),
    )
    seed(
      athleteProfileRepository,
      makeUser({ id: 'u30' }),
      makeProfile('u30', { id: 'p30', birthDate: bornThirtyYearsAgo }),
    )

    const between15and25 = await sut.execute({ minAge: 15, maxAge: 25 })
    expect(between15and25.items.map((i) => i.id)).toEqual(['p20'])

    const atLeast25 = await sut.execute({ minAge: 25 })
    expect(atLeast25.items.map((i) => i.id).sort()).toEqual(['p30'])
  })

  it('paginates and reports total + hasMore correctly', async () => {
    for (let i = 1; i <= 25; i++) {
      seed(
        athleteProfileRepository,
        makeUser({ id: `u-${i}` }),
        makeProfile(`u-${i}`, {
          id: `p-${i}`,
          createdAt: new Date(2025, 0, i),
        }),
      )
    }

    const firstPage = await sut.execute({ page: 1, pageSize: 10 })
    expect(firstPage.total).toBe(25)
    expect(firstPage.items).toHaveLength(10)
    expect(firstPage.hasMore).toBe(true)

    const lastPage = await sut.execute({ page: 3, pageSize: 10 })
    expect(lastPage.items).toHaveLength(5)
    expect(lastPage.hasMore).toBe(false)
  })
})
