import type { AthleteProfile, Match, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import { SearchAdminUseCase } from './search.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let matchRepository: InMemoryMatchRepository
let sut: SearchAdminUseCase

function makeUser(id: string, name: string, email: string): User {
  return {
    id,
    email,
    name,
    password: 'hashed',
    role: 'ATHLETE',
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: true,
    isActive: true,
    isProfile: true,
    stripeCustomerId: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeAthlete(
  id: string,
  userId: string,
  overrides: Partial<AthleteProfile> = {},
): AthleteProfile {
  return {
    id,
    userId,
    cpf: '00000000000',
    gender: 'MALE',
    nickname: overrides.nickname ?? null,
    profilePhoto: overrides.profilePhoto ?? null,
    birthDate: new Date('2005-06-15'),
    instagramUrl: null,
    twitterUrl: null,
    youtubeUrl: null,
    height: 1.8,
    weight: 75,
    dominantFoot: 'RIGHT',
    primaryPosition: overrides.primaryPosition ?? 'FORWARD',
    secondaryPosition: null,
    currentClub: overrides.currentClub ?? null,
    biography: null,
    hasManager: false,
    managerName: null,
    managerCompany: null,
    managerContact: null,
    hasNutritionist: false,
    hasPsychologist: false,
    hasPersonalTrainer: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  }
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? 'match-1',
    athleteId: overrides.athleteId ?? 'athlete-1',
    myTeamId: 'team-1',
    adversaryTeam: overrides.adversaryTeam ?? 'Palmeiras',
    date: overrides.date ?? new Date('2025-05-01'),
    modality: 'FUT_11',
    category: 'PROFESSIONAL',
    location: 'Estádio',
    streamUrl: null,
    competitionId: null,
    status: 'FINISHED',
    result: 'WIN',
    myTeamScore: 2,
    adversaryScore: 1,
    playerPosition: 'STARTER',
    observations: null,
    matchDuration: 90,
    approximateTime: 90,
    photoUrl: null,
    videoUrl: null,
    youtubeUrl: null,
    performanceRating: null,
    createdAt: new Date('2025-05-01'),
    updatedAt: new Date('2025-05-01'),
  }
}

beforeEach(() => {
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  matchRepository = new InMemoryMatchRepository()
  sut = new SearchAdminUseCase(athleteProfileRepository, matchRepository)

  athleteProfileRepository.addUser(makeUser('u1', 'Ronaldo Assis', 'r@x.com'))
  athleteProfileRepository.addUser(makeUser('u2', 'Dida Silva', 'd@x.com'))
  athleteProfileRepository.items.push(
    makeAthlete('athlete-1', 'u1', {
      nickname: 'Ronaldinho',
      currentClub: 'Barcelona',
    }),
  )
  athleteProfileRepository.items.push(
    makeAthlete('athlete-2', 'u2', { primaryPosition: 'GOALKEEPER' }),
  )

  matchRepository.athletesById['athlete-1'] = {
    id: 'athlete-1',
    nickname: 'Ronaldinho',
    profilePhoto: null,
    primaryPosition: 'FORWARD',
    birthDate: new Date('2000-01-01'),
    user: { name: 'Ronaldo Assis', email: 'r@x.com' },
  }
  matchRepository.athletesById['athlete-2'] = {
    id: 'athlete-2',
    nickname: null,
    profilePhoto: null,
    primaryPosition: 'GOALKEEPER',
    birthDate: new Date('1990-01-01'),
    user: { name: 'Dida Silva', email: 'd@x.com' },
  }
})

describe('Search Admin Use Case (global search)', () => {
  it('returns empty groups when no matches or athletes match the term', async () => {
    const result = await sut.execute({ q: 'xyz' })

    expect(result.athletes).toEqual([])
    expect(result.matches).toEqual([])
  })

  it('finds athletes by name, nickname or email (case-insensitive)', async () => {
    const byName = await sut.execute({ q: 'ronal' })
    expect(byName.athletes.map((a) => a.id)).toEqual(['athlete-1'])

    const byEmail = await sut.execute({ q: 'D@X' })
    expect(byEmail.athletes.map((a) => a.id)).toEqual(['athlete-2'])

    const byNickname = await sut.execute({ q: 'ronaldinho' })
    expect(byNickname.athletes[0]?.nickname).toBe('Ronaldinho')
  })

  it('finds matches by adversary team and embeds athlete context', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm1', athleteId: 'athlete-1', adversaryTeam: 'Palmeiras' }),
      makeMatch({ id: 'm2', athleteId: 'athlete-2', adversaryTeam: 'Corinthians' }),
    )

    const result = await sut.execute({ q: 'palmei' })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.id).toBe('m1')
    expect(result.matches[0]?.athlete.name).toBe('Ronaldo Assis')
  })

  it('respects the limit for each group', async () => {
    for (let i = 0; i < 8; i++) {
      athleteProfileRepository.addUser(makeUser(`u-ex-${i}`, `Extra Ronaldo ${i}`, `ex${i}@x.com`))
      athleteProfileRepository.items.push(
        makeAthlete(`athlete-ex-${i}`, `u-ex-${i}`, {
          nickname: null,
          updatedAt: new Date(2025, 0, i + 1),
        }),
      )
    }

    const result = await sut.execute({ q: 'ronaldo', limit: 3 })
    expect(result.athletes).toHaveLength(3)
  })
})
