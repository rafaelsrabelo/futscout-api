import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'
import { DeletePlayAdminUseCase, PlayNotFoundError } from './delete-play.js'

let playRepository: InMemoryPlayRepository
let sut: DeletePlayAdminUseCase

beforeEach(() => {
  playRepository = new InMemoryPlayRepository()
  sut = new DeletePlayAdminUseCase(playRepository)
})

describe('Delete Play — admin', () => {
  it('throws PlayNotFoundError when play does not exist', async () => {
    await expect(sut.execute({ playId: 'ghost' })).rejects.toBeInstanceOf(
      PlayNotFoundError,
    )
  })

  it('removes the play regardless of owning athlete', async () => {
    const play = await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-other',
      playType: 'GOAL',
    })

    await sut.execute({ playId: play.id })

    expect(playRepository.items).toHaveLength(0)
  })
})
