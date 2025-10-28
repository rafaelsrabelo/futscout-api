import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAthleteProfileRepository } from '../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { EditAthleteProfileUseCase } from './edit-athlete-profile.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: EditAthleteProfileUseCase

describe('Edit Athlete Profile Use Case', () => {
  beforeEach(() => {
    athleteProfileRepository = new InMemoryAthleteProfileRepository()
    sut = new EditAthleteProfileUseCase(athleteProfileRepository)
  })

  it('should be able to edit athlete profile', async () => {
    // Primeiro criar um perfil
    const createdProfile = await athleteProfileRepository.create({
      userId: 'user-01',
      cpf: '12345678901',
      gender: 'MALE',
      nickname: 'player1',
      birthDate: new Date('1995-01-01'),
      height: 180,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
    })

    // Agora editar o perfil
    const { athleteProfile } = await sut.execute({
      userId: 'user-01',
      nickname: 'newplayer1',
      height: 185,
      weight: 80,
      currentClub: 'FC Example',
      biography: 'Great player',
    })

    expect(athleteProfile.id).toEqual(createdProfile.id)
    expect(athleteProfile.nickname).toEqual('newplayer1')
    expect(athleteProfile.height).toEqual(185)
    expect(athleteProfile.weight).toEqual(80)
    expect(athleteProfile.currentClub).toEqual('FC Example')
    expect(athleteProfile.biography).toEqual('Great player')
  })

  it('should not be able to edit profile that does not exist', async () => {
    await expect(() =>
      sut.execute({
        userId: 'non-existent-user',
        nickname: 'newplayer',
      }),
    ).rejects.toBeInstanceOf(Error)
  })

  it('should not be able to edit profile with existing nickname', async () => {
    // Criar dois perfis
    await athleteProfileRepository.create({
      userId: 'user-01',
      cpf: '12345678901',
      gender: 'MALE',
      nickname: 'player1',
      birthDate: new Date('1995-01-01'),
      height: 180,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
    })

    await athleteProfileRepository.create({
      userId: 'user-02',
      cpf: '12345678902',
      gender: 'MALE',
      nickname: 'player2',
      birthDate: new Date('1996-01-01'),
      height: 175,
      weight: 70,
      dominantFoot: 'LEFT',
      primaryPosition: 'FORWARD',
      hasManager: false,
    })

    // Tentar editar user-02 para usar o nickname do user-01
    await expect(() =>
      sut.execute({
        userId: 'user-02',
        nickname: 'player1',
      }),
    ).rejects.toBeInstanceOf(Error)
  })

  it('should be able to keep the same nickname when editing other fields', async () => {
    // Criar um perfil
    await athleteProfileRepository.create({
      userId: 'user-01',
      cpf: '12345678901',
      gender: 'MALE',
      nickname: 'player1',
      birthDate: new Date('1995-01-01'),
      height: 180,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
    })

    // Editar mantendo o mesmo nickname
    const { athleteProfile } = await sut.execute({
      userId: 'user-01',
      nickname: 'player1', // mesmo nickname
      height: 185,
    })

    expect(athleteProfile.nickname).toEqual('player1')
    expect(athleteProfile.height).toEqual(185)
  })
})
