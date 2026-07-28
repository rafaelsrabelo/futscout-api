import { beforeEach, describe, expect, it } from 'vitest'
import type { User } from '../../../../../generated/prisma/client.js'
import { InMemoryAthleteProfileRepository } from '../../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { SearchAthletesTool } from './search-athletes-tool.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: SearchAthletesTool

/** Data de nascimento que resulta na idade pedida, hoje. */
function birthDateForAge(age: number): Date {
  const today = new Date()
  return new Date(today.getFullYear() - age, today.getMonth(), today.getDate())
}

interface SeedAthlete {
  name: string
  age: number
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  dominantFoot?: 'RIGHT' | 'LEFT'
  height?: number
  currentClub?: string
}

async function seedAthlete(athlete: SeedAthlete) {
  const userId = `user-${athleteProfileRepository.users.length + 1}`

  athleteProfileRepository.users.push({
    id: userId,
    name: athlete.name,
    role: 'ATHLETE',
    isActive: true,
  } as User)

  return athleteProfileRepository.create({
    userId,
    gender: 'MALE',
    birthDate: birthDateForAge(athlete.age),
    height: athlete.height ?? 1.75,
    weight: 70,
    dominantFoot: athlete.dominantFoot ?? 'RIGHT',
    primaryPosition: athlete.primaryPosition ?? 'FORWARD',
    ...(athlete.currentClub ? { currentClub: athlete.currentClub } : {}),
  })
}

beforeEach(() => {
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new SearchAthletesTool(athleteProfileRepository)
})

describe('Search Athletes Tool', () => {
  it('should find athletes by position and dominant foot', async () => {
    await seedAthlete({
      name: 'Canhoto Atacante',
      age: 19,
      primaryPosition: 'FORWARD',
      dominantFoot: 'LEFT',
    })
    await seedAthlete({
      name: 'Destro Atacante',
      age: 19,
      primaryPosition: 'FORWARD',
      dominantFoot: 'RIGHT',
    })

    const result = await sut.execute({
      primaryPosition: 'FORWARD',
      dominantFoot: 'LEFT',
    })

    expect(result.cards).toHaveLength(1)
    expect(result.cards?.[0]?.name).toEqual('Canhoto Atacante')
    expect(result.data.total).toEqual(1)
  })

  it('should translate a youth category into an age ceiling', async () => {
    await seedAthlete({ name: 'Sub-17', age: 16 })
    await seedAthlete({ name: 'Profissional', age: 27 })

    const result = await sut.execute({ maxAge: 17 })

    expect(result.cards).toHaveLength(1)
    expect(result.cards?.[0]?.name).toEqual('Sub-17')
    expect(result.cards?.[0]?.age).toEqual(16)
  })

  it('should refuse a search with no criteria instead of returning everyone', async () => {
    await seedAthlete({ name: 'Qualquer Um', age: 20 })

    const result = await sut.execute({})

    expect(result.data).toEqual({ error: 'NO_CRITERIA' })
    expect(result.cards).toBeUndefined()
  })

  it('should refuse an inverted age range', async () => {
    const result = await sut.execute({ minAge: 20, maxAge: 16 })

    expect(result.data).toEqual({ error: 'INVALID_RANGE', field: 'age' })
  })

  it('should drop keys the database cannot filter by', async () => {
    await seedAthlete({
      name: 'Rápido',
      age: 20,
      primaryPosition: 'MIDFIELDER',
    })

    // "velocidade" não é filtro — o Zod descarta e a busca roda só com a posição.
    const result = await sut.execute({
      primaryPosition: 'MIDFIELDER',
      minSpeed: 30,
    })

    expect(result.cards).toHaveLength(1)
    expect(result.appliedFilters).toEqual({ primaryPosition: 'MIDFIELDER' })
  })

  it('should report an empty result without cards', async () => {
    await seedAthlete({
      name: 'Zagueiro',
      age: 20,
      primaryPosition: 'DEFENDER',
    })

    const result = await sut.execute({ primaryPosition: 'GOALKEEPER' })

    expect(result.cards).toHaveLength(0)
    expect(result.data.total).toEqual(0)
    expect(result.summary).toContain('Nenhum atleta encontrado')
  })

  it('should expose the applied filters so the next turn can refine them', async () => {
    await seedAthlete({
      name: 'Alto',
      age: 21,
      height: 1.9,
      primaryPosition: 'DEFENDER',
    })

    const result = await sut.execute({
      primaryPosition: 'DEFENDER',
      minHeight: 1.85,
      limit: 5,
    })

    // `limit` é paginação, não critério: não entra nos filtros salvos.
    expect(result.appliedFilters).toEqual({
      primaryPosition: 'DEFENDER',
      minHeight: 1.85,
    })
  })
})
