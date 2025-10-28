import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAthleteProfileRepository } from '../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { GetMyAthleteProfileUseCase } from './get-my-athlete-profile.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: GetMyAthleteProfileUseCase

describe('Get My Athlete Profile Use Case', () => {
  beforeEach(() => {
    athleteProfileRepository = new InMemoryAthleteProfileRepository()
    sut = new GetMyAthleteProfileUseCase(athleteProfileRepository)
  })

  it('should be able to get my athlete profile', async () => {
    // Criar um perfil de atleta
    const athleteProfile = await athleteProfileRepository.create({
      userId: 'user-01',
      cpf: '12345678901',
      gender: 'MALE',
      nickname: 'testplayer',
      birthDate: new Date('1995-01-01'),
      height: 180,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
    })

    const { profile } = await sut.execute({
      userId: 'user-01',
    })

    expect(profile.id).toEqual(athleteProfile.id)
    expect(profile.userId).toEqual('user-01')
    expect(profile.nickname).toEqual('testplayer')
    expect(profile.height).toEqual(180)
    expect(profile.weight).toEqual(75)
  })

  it('should not be able to get profile that does not exist', async () => {
    await expect(() =>
      sut.execute({
        userId: 'non-existent-user',
      }),
    ).rejects.toBeInstanceOf(Error)
  })
})
