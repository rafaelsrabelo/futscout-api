import { beforeEach, describe, expect, it } from 'vitest'
import { InMemorySavedSearchRepository } from '../../../repositories/in-memory/in-memory-saved-search-repository.js'
import type { AthleteSearchFilters } from '../../../repositories/saved-search-repository.js'
import { SaveSearchTool } from './save-search-tool.js'
import type { ScoutToolContext } from './tool-types.js'

const STANDING: AthleteSearchFilters = {
  primaryPosition: 'FORWARD',
  dominantFoot: 'LEFT',
  maxAge: 20,
}

function makeCtx(
  standingFilters: AthleteSearchFilters | null = STANDING,
): ScoutToolContext {
  return { userId: 'observer-1', turnId: 'turn-1', standingFilters }
}

let savedSearchRepository: InMemorySavedSearchRepository
let sut: SaveSearchTool

beforeEach(() => {
  savedSearchRepository = new InMemorySavedSearchRepository()
  sut = new SaveSearchTool(savedSearchRepository)
})

describe('Save Search Tool', () => {
  it('should save the search the observer actually saw', async () => {
    const result = await sut.execute({ title: 'Atacantes canhotos' }, makeCtx())

    expect(result.savedSearchId).toEqual(expect.any(String))
    expect(savedSearchRepository.items).toHaveLength(1)
    expect(savedSearchRepository.items[0]).toMatchObject({
      userId: 'observer-1',
      title: 'Atacantes canhotos',
      filters: STANDING,
    })
  })

  it('should ignore filters the model tries to pass in', async () => {
    // O modelo "relembra" errado — só GOALKEEPER, perdendo o resto. O que vale
    // é o que a busca aplicou, não o que ele digitou.
    const result = await sut.execute(
      {
        title: 'Atacantes canhotos',
        filters: { primaryPosition: 'GOALKEEPER' },
      },
      makeCtx(),
    )

    expect(result.appliedFilters).toEqual(STANDING)
    expect(savedSearchRepository.items[0]?.filters).toEqual(STANDING)
  })

  it('should refuse to save before any search has run', async () => {
    const result = await sut.execute({ title: 'Qualquer coisa' }, makeCtx(null))

    expect(result.data).toEqual({ error: 'NO_FILTERS' })
    expect(result.savedSearchId).toBeUndefined()
    expect(savedSearchRepository.items).toHaveLength(0)
  })

  it('should refuse to save an empty filter set', async () => {
    const result = await sut.execute({ title: 'Vazia' }, makeCtx({}))

    expect(result.data).toEqual({ error: 'NO_FILTERS' })
    expect(savedSearchRepository.items).toHaveLength(0)
  })

  it('should require a title', async () => {
    await expect(() => sut.execute({}, makeCtx())).rejects.toThrow()
  })

  it('should persist the optional description', async () => {
    await sut.execute(
      { title: 'Atacantes canhotos', description: 'Para a base do sub-20' },
      makeCtx(),
    )

    expect(savedSearchRepository.items[0]?.description).toEqual(
      'Para a base do sub-20',
    )
  })
})
