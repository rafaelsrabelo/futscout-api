import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryTeamHistoryRepository } from '../../repositories/in-memory/in-memory-team-history-repository.js'
import type { TeamRepository } from '../../repositories/team-repository.js'

import {
  AthleteNotFoundError,
  CreateTeamHistoryAdminUseCase,
  InvalidTeamHistoryPeriodError,
  TeamNotFoundError,
} from './create-team-history.js'
import {
  DeleteTeamHistoryAdminUseCase,
  TeamHistoryNotFoundError,
} from './delete-team-history.js'
import { UpdateTeamHistoryAdminUseCase } from './update-team-history.js'

let teamHistoryRepository: InMemoryTeamHistoryRepository
let athleteRepository: InMemoryAthleteProfileRepository
let teamRepository: TeamRepository
let createSut: CreateTeamHistoryAdminUseCase
let updateSut: UpdateTeamHistoryAdminUseCase
let deleteSut: DeleteTeamHistoryAdminUseCase

function makeUser(id: string): User {
  return {
    id,
    email: `${id}@x.com`,
    cpf: null,
    name: `Nome ${id}`,
    password: 'hashed',
    role: 'ATHLETE',
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: true,
    isActive: true,
    isProfile: true,
    isImported: false,
    stripeCustomerId: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeAthlete(id: string, userId: string): AthleteProfile {
  return {
    id,
    userId,
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
  } as AthleteProfile
}

function makeTeamRepoStub(existingTeamIds: string[]): TeamRepository {
  const ids = new Set(existingTeamIds)
  return {
    findById: async (id) => {
      if (!ids.has(id)) return null
      return {
        id,
        name: 'Team',
        nickname: null,
        acronym: null,
        shieldPhoto: null,
        isPrincipal: false,
        userId: 'user-x',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
    create: async () => {
      throw new Error('not used')
    },
    findByUserId: async () => [],
    findByName: async () => null,
    update: async () => {
      throw new Error('not used')
    },
    delete: async () => {
      // not used
    },
    unsetPrincipalTeams: async () => {
      // not used
    },
  } as unknown as TeamRepository
}

beforeEach(() => {
  teamHistoryRepository = new InMemoryTeamHistoryRepository()
  athleteRepository = new InMemoryAthleteProfileRepository()
  teamRepository = makeTeamRepoStub(['team-1', 'team-2'])
  createSut = new CreateTeamHistoryAdminUseCase(
    teamHistoryRepository,
    athleteRepository,
    teamRepository,
  )
  updateSut = new UpdateTeamHistoryAdminUseCase(
    teamHistoryRepository,
    teamRepository,
  )
  deleteSut = new DeleteTeamHistoryAdminUseCase(teamHistoryRepository)

  athleteRepository.addUser(makeUser('user-1'))
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
})

describe('Create Team History Admin', () => {
  it('throws AthleteNotFoundError when athlete does not exist', async () => {
    await expect(
      createSut.execute({
        athleteProfileId: 'ghost',
        teamId: 'team-1',
        startDate: new Date('2024-01-01'),
      }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('throws TeamNotFoundError when team does not exist', async () => {
    await expect(
      createSut.execute({
        athleteProfileId: 'athlete-1',
        teamId: 'ghost',
        startDate: new Date('2024-01-01'),
      }),
    ).rejects.toBeInstanceOf(TeamNotFoundError)
  })

  it('throws InvalidTeamHistoryPeriodError when endDate <= startDate', async () => {
    await expect(
      createSut.execute({
        athleteProfileId: 'athlete-1',
        teamId: 'team-1',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-01-01'),
      }),
    ).rejects.toBeInstanceOf(InvalidTeamHistoryPeriodError)
  })

  it('creates entry with current team (endDate null)', async () => {
    const entry = await createSut.execute({
      athleteProfileId: 'athlete-1',
      teamId: 'team-1',
      startDate: new Date('2024-01-01'),
    })

    expect(entry.athleteId).toBe('athlete-1')
    expect(entry.teamId).toBe('team-1')
    expect(entry.endDate).toBeNull()
  })
})

describe('Update Team History Admin', () => {
  it('throws TeamHistoryNotFoundError when not found', async () => {
    await expect(
      updateSut.execute({ teamHistoryId: 'ghost', teamId: 'team-1' }),
    ).rejects.toBeInstanceOf(TeamHistoryNotFoundError)
  })

  it('throws TeamNotFoundError when reassigning to invalid team', async () => {
    const created = await createSut.execute({
      athleteProfileId: 'athlete-1',
      teamId: 'team-1',
      startDate: new Date('2024-01-01'),
    })
    await expect(
      updateSut.execute({ teamHistoryId: created.id, teamId: 'ghost' }),
    ).rejects.toBeInstanceOf(TeamNotFoundError)
  })

  it('updates teamId and dates', async () => {
    const created = await createSut.execute({
      athleteProfileId: 'athlete-1',
      teamId: 'team-1',
      startDate: new Date('2024-01-01'),
    })

    const updated = await updateSut.execute({
      teamHistoryId: created.id,
      teamId: 'team-2',
      endDate: new Date('2024-12-31'),
    })

    expect(updated.teamId).toBe('team-2')
    expect(updated.endDate).toEqual(new Date('2024-12-31'))
  })

  it('rejects invalid period when updating dates', async () => {
    const created = await createSut.execute({
      athleteProfileId: 'athlete-1',
      teamId: 'team-1',
      startDate: new Date('2024-06-01'),
    })

    await expect(
      updateSut.execute({
        teamHistoryId: created.id,
        endDate: new Date('2024-01-01'),
      }),
    ).rejects.toBeInstanceOf(InvalidTeamHistoryPeriodError)
  })
})

describe('Delete Team History Admin', () => {
  it('throws TeamHistoryNotFoundError when not found', async () => {
    await expect(
      deleteSut.execute({ teamHistoryId: 'ghost' }),
    ).rejects.toBeInstanceOf(TeamHistoryNotFoundError)
  })

  it('removes the entry', async () => {
    const created = await createSut.execute({
      athleteProfileId: 'athlete-1',
      teamId: 'team-1',
      startDate: new Date('2024-01-01'),
    })

    await deleteSut.execute({ teamHistoryId: created.id })
    expect(teamHistoryRepository.items).toHaveLength(0)
  })
})
