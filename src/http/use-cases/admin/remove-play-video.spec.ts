import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'
import {
  PlayNotFoundError,
  RemovePlayVideoAdminUseCase,
} from './remove-play-video.js'

let playRepository: InMemoryPlayRepository
let sut: RemovePlayVideoAdminUseCase

beforeEach(() => {
  playRepository = new InMemoryPlayRepository()
  sut = new RemovePlayVideoAdminUseCase(playRepository)
})

describe('Remove Play Video — admin', () => {
  it('throws PlayNotFoundError when play does not exist', async () => {
    await expect(sut.execute({ playId: 'ghost' })).rejects.toBeInstanceOf(
      PlayNotFoundError,
    )
  })

  it('clears videoUrl and thumbnailUrl, keeping the play', async () => {
    const play = await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'GOAL',
      videoUrl: 'https://cdn/v.mp4',
      thumbnailUrl: 'https://cdn/thumb.jpg',
    })

    const result = await sut.execute({ playId: play.id })

    expect(result.id).toBe(play.id)
    expect(result.videoUrl).toBeNull()
    expect(result.thumbnailUrl).toBeNull()
    expect(playRepository.items).toHaveLength(1)
  })
})
