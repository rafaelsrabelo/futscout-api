import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'

import { PlayNotFoundError, UpdatePlayAdminUseCase } from './update-play.js'

let playRepository: InMemoryPlayRepository
let sut: UpdatePlayAdminUseCase

beforeEach(async () => {
  playRepository = new InMemoryPlayRepository()
  sut = new UpdatePlayAdminUseCase(playRepository)

  await playRepository.createWithClassifications({
    matchId: 'match-1',
    athleteId: 'athlete-1',
    playType: 'GOAL',
    rating: 4,
    observations: 'Cabeceio no segundo tempo',
    classifications: ['TECHNICAL'],
  })
})

describe('Update Play Admin Use Case', () => {
  it('throws PlayNotFoundError when play does not exist', async () => {
    await expect(sut.execute({ playId: 'ghost' })).rejects.toBeInstanceOf(
      PlayNotFoundError,
    )
  })

  it('updates basic metadata fields', async () => {
    const playId = playRepository.items[0]!.id

    const updated = await sut.execute({
      playId,
      playType: 'ASSIST',
      rating: 5,
      observations: 'Passe espetacular',
    })

    expect(updated.playType).toBe('ASSIST')
    expect(updated.rating).toBe(5)
    expect(updated.observations).toBe('Passe espetacular')
  })

  it('replaces classifications when provided', async () => {
    const playId = playRepository.items[0]!.id

    const updated = await sut.execute({
      playId,
      classifications: ['PHYSICAL', 'MENTAL'],
    })

    expect(updated.classifications).toHaveLength(2)
    const values = updated.classifications.map((c) => c.classification).sort()
    expect(values).toEqual(['MENTAL', 'PHYSICAL'])
  })

  it('clears classifications when given an empty array', async () => {
    const playId = playRepository.items[0]!.id

    const updated = await sut.execute({
      playId,
      classifications: [],
    })

    expect(updated.classifications).toHaveLength(0)
  })

  it('does not touch classifications when not provided', async () => {
    const playId = playRepository.items[0]!.id
    const before = playRepository.items[0]!.classifications.length

    const updated = await sut.execute({ playId, rating: 3 })

    expect(updated.classifications).toHaveLength(before)
  })

  it('clears nullable fields when null is passed', async () => {
    const playId = playRepository.items[0]!.id

    const updated = await sut.execute({
      playId,
      observations: null,
      rating: null,
    })

    expect(updated.observations).toBeNull()
    expect(updated.rating).toBeNull()
  })
})
