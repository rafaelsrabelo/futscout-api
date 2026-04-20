import type {
  AthleteProfile,
  TeamHistory,
  User,
} from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryTeamHistoryRepository } from '../../repositories/in-memory/in-memory-team-history-repository.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'
import { ListAthleteTeamHistoryAdminUseCase } from './list-athlete-team-history.js'

let teamHistoryRepository: InMemoryTeamHistoryRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: ListAthleteTeamHistoryAdminUseCase

function makeAthlete(id: string): AthleteProfile {
  return {
    id,
    userId: `user-${id}`,
    cpf: '00000000000',
    gender: 'MALE',
    nickname: null,
    profilePhoto: null,
    birthDate: new Date('2005-06-15'),
    instagramUrl: null,
    twitterUrl: null,
    youtubeUrl: null,
    height: 1.8,
    weight: 75,
    dominantFoot: 'RIGHT',
    primaryPosition: 'MIDFIELDER',
    secondaryPosition: null,
    currentClub: null,
    biography: null,
    hasManager: false,
    managerName: null,
    managerCompany: null,
    managerContact: null,
    hasNutritionist: false,
    hasPsychologist: false,
    hasPersonalTrainer: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeUser(id: string): User {
  return {
    id,
    email: `${id}@x.com`,
    name: 'User',
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

function makeTeamHistory(
  id: string,
  athleteId: string,
  teamId: string,
  overrides: Partial<TeamHistory> = {},
): TeamHistory {
  return {
    id,
    athleteId,
    teamId,
    startDate: overrides.startDate ?? new Date('2024-01-01'),
    endDate: overrides.endDate ?? null,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01'),
  }
}

beforeEach(() => {
  teamHistoryRepository = new InMemoryTeamHistoryRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new ListAthleteTeamHistoryAdminUseCase(
    teamHistoryRepository,
    athleteProfileRepository,
  )

  athleteProfileRepository.addUser(makeUser('user-athlete-1'))
  athleteProfileRepository.items.push(makeAthlete('athlete-1'))
})

describe('List Athlete Team History Admin Use Case', () => {
  it('throws when athlete does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('returns empty + null current when athlete has no team history', async () => {
    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.items).toEqual([])
    expect(result.currentTeam).toBeNull()
  })

  it('orders by startDate desc and identifies currentTeam', async () => {
    teamHistoryRepository.teams['team-a'] = {
      id: 'team-a',
      name: 'Palmeiras',
      acronym: 'SEP',
      shieldPhoto: 'sep.png',
    }
    teamHistoryRepository.teams['team-b'] = {
      id: 'team-b',
      name: 'Corinthians',
      acronym: 'SCCP',
      shieldPhoto: null,
    }

    teamHistoryRepository.items.push(
      makeTeamHistory('th-old', 'athlete-1', 'team-b', {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2022-12-01'),
      }),
      makeTeamHistory('th-current', 'athlete-1', 'team-a', {
        startDate: new Date('2023-01-01'),
        endDate: null,
      }),
    )

    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.items.map((i) => i.id)).toEqual(['th-current', 'th-old'])
    expect(result.currentTeam?.id).toBe('th-current')
    expect(result.currentTeam?.team).toEqual({
      id: 'team-a',
      name: 'Palmeiras',
      acronym: 'SEP',
      shieldPhoto: 'sep.png',
    })
  })

  it('returns currentTeam as null when all entries have endDate', async () => {
    teamHistoryRepository.teams['team-a'] = {
      id: 'team-a',
      name: 'Palmeiras',
      acronym: null,
      shieldPhoto: null,
    }
    teamHistoryRepository.items.push(
      makeTeamHistory('th-1', 'athlete-1', 'team-a', {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2022-01-01'),
      }),
    )

    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.items).toHaveLength(1)
    expect(result.currentTeam).toBeNull()
  })
})
