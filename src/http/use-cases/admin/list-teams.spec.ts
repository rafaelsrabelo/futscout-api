import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import type {
  AdminTeamFilters,
  AdminTeamListItem,
  AdminTeamPagination,
  TeamRepository,
} from '../../repositories/team-repository.js'

import { AthleteNotFoundError, ListTeamsAdminUseCase } from './list-teams.js'

interface FakeTeam extends AdminTeamListItem {}

class FakeTeamRepository {
  public teams: FakeTeam[] = []

  async findManyForAdmin(
    filters: AdminTeamFilters,
    pagination: AdminTeamPagination,
  ): Promise<{ items: AdminTeamListItem[]; total: number }> {
    let filtered = this.teams.slice()

    if (filters.q && filters.q.trim().length > 0) {
      const needle = filters.q.trim().toLowerCase()
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(needle))
    }
    if (filters.ownerUserId) {
      filtered = filtered.filter((t) => t.userId === filters.ownerUserId)
    }

    filtered.sort((a, b) => {
      if (a.isPrincipal !== b.isPrincipal) return a.isPrincipal ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    const total = filtered.length
    const start = (pagination.page - 1) * pagination.pageSize
    return {
      items: filtered.slice(start, start + pagination.pageSize),
      total,
    }
  }
}

let teamRepository: FakeTeamRepository
let athleteRepository: InMemoryAthleteProfileRepository
let sut: ListTeamsAdminUseCase

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

beforeEach(() => {
  teamRepository = new FakeTeamRepository()
  athleteRepository = new InMemoryAthleteProfileRepository()
  sut = new ListTeamsAdminUseCase(
    teamRepository as unknown as TeamRepository,
    athleteRepository,
  )

  athleteRepository.addUser(makeUser('user-1'))
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
  athleteRepository.addUser(makeUser('user-2'))
  athleteRepository.items.push(makeAthlete('athlete-2', 'user-2'))

  teamRepository.teams = [
    {
      id: 't1',
      name: 'Santa Cruz',
      acronym: 'SCC',
      shieldPhoto: null,
      isPrincipal: true,
      userId: 'user-1',
      createdAt: new Date('2025-01-01'),
    },
    {
      id: 't2',
      name: 'Vassallo Sport',
      acronym: 'VAS',
      shieldPhoto: null,
      isPrincipal: false,
      userId: 'user-1',
      createdAt: new Date('2025-02-01'),
    },
    {
      id: 't3',
      name: 'Estação Sub-13',
      acronym: 'EST',
      shieldPhoto: null,
      isPrincipal: false,
      userId: 'user-2',
      createdAt: new Date('2025-03-01'),
    },
  ]
})

describe('List Teams Admin Use Case', () => {
  it('returns all teams paginated when no filter', async () => {
    const result = await sut.execute({ page: 1, pageSize: 20 })
    expect(result.total).toBe(3)
    expect(result.items).toHaveLength(3)
  })

  it('filters by q (case-insensitive partial match on name)', async () => {
    const result = await sut.execute({ q: 'sant', page: 1, pageSize: 20 })
    expect(result.total).toBe(1)
    expect(result.items[0]?.name).toBe('Santa Cruz')
  })

  it('filters by athleteProfileId (returns only teams of that athlete owner)', async () => {
    const result = await sut.execute({
      athleteProfileId: 'athlete-1',
      page: 1,
      pageSize: 20,
    })
    expect(result.total).toBe(2)
    expect(result.items.map((t) => t.userId)).toEqual(['user-1', 'user-1'])
  })

  it('combines q + athleteProfileId', async () => {
    const result = await sut.execute({
      q: 'vass',
      athleteProfileId: 'athlete-1',
      page: 1,
      pageSize: 20,
    })
    expect(result.total).toBe(1)
    expect(result.items[0]?.name).toBe('Vassallo Sport')
  })

  it('throws AthleteNotFoundError when athleteProfileId does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost', page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('paginates correctly', async () => {
    const page1 = await sut.execute({ page: 1, pageSize: 2 })
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(3)

    const page2 = await sut.execute({ page: 2, pageSize: 2 })
    expect(page2.items).toHaveLength(1)
    expect(page2.total).toBe(3)
  })
})
