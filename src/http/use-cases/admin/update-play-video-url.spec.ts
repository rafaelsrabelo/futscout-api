import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'
import {
  PlayNotFoundError,
  UpdatePlayVideoUrlAdminUseCase,
} from './update-play-video-url.js'

let playRepository: InMemoryPlayRepository
let sut: UpdatePlayVideoUrlAdminUseCase

beforeEach(() => {
  playRepository = new InMemoryPlayRepository()
  sut = new UpdatePlayVideoUrlAdminUseCase(playRepository)
})

describe('Update Play Video URL — admin', () => {
  it('throws PlayNotFoundError when play does not exist', async () => {
    await expect(
      sut.execute({ playId: 'ghost', videoUrl: 'https://x/v.mp4' }),
    ).rejects.toBeInstanceOf(PlayNotFoundError)
  })

  it('attaches video to a play regardless of owning athlete', async () => {
    const play = await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-other',
      playType: 'GOAL',
    })

    const result = await sut.execute({
      playId: play.id,
      videoUrl: 'https://cdn/v.mp4',
    })

    expect(result.videoUrl).toBe('https://cdn/v.mp4')
    expect(result.thumbnailUrl).toBeNull()
  })

  it('persists thumbnailUrl when provided (no async generation needed)', async () => {
    const play = await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'ASSIST',
    })

    const result = await sut.execute({
      playId: play.id,
      videoUrl: 'https://cdn/v2.mp4',
      thumbnailUrl: 'https://cdn/thumb.jpg',
    })

    expect(result.videoUrl).toBe('https://cdn/v2.mp4')
    expect(result.thumbnailUrl).toBe('https://cdn/thumb.jpg')
  })
})
