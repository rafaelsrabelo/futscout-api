import { beforeEach, describe, expect, it } from 'vitest'
import { InMemorySavedSearchRepository } from '../../repositories/in-memory/in-memory-saved-search-repository.js'
import { InMemoryScoutChatRepository } from '../../repositories/in-memory/in-memory-scout-chat-repository.js'
import type { AthleteSearchFilters } from '../../repositories/saved-search-repository.js'
import type { ScoutMessageToolCall } from '../../repositories/scout-chat-repository.js'
import { ScoutMessageHasNoFiltersError } from '../errors/scout-message-has-no-filters-error.js'
import { ScoutMessageNotFoundError } from '../errors/scout-message-not-found-error.js'
import { SaveSearchFromMessageUseCase } from './save-search-from-message.js'

const OBSERVER_ID = 'observer-1'

const FILTERS: AthleteSearchFilters = {
  primaryPosition: 'MIDFIELDER',
  hasManager: false,
}

let scoutChatRepository: InMemoryScoutChatRepository
let savedSearchRepository: InMemorySavedSearchRepository
let sut: SaveSearchFromMessageUseCase

/** Cria a conversa e o turno do assistente, devolvendo o id da mensagem. */
async function seedTurn({
  userId = OBSERVER_ID,
  appliedFilters = FILTERS,
}: {
  userId?: string
  // `null` para simular turno sem busca. `undefined` dispararia o default.
  appliedFilters?: AthleteSearchFilters | null
} = {}) {
  const thread = await scoutChatRepository.createThread({ userId })
  const message = await scoutChatRepository.createMessage({
    threadId: thread.id,
    role: 'ASSISTANT',
    content: 'Achei 12 meias sem empresário.',
    toolCall: {
      responseType: 'ATHLETE_LIST',
      ...(appliedFilters ? { appliedFilters } : {}),
    },
  })

  return { threadId: thread.id, messageId: message.id }
}

beforeEach(() => {
  scoutChatRepository = new InMemoryScoutChatRepository()
  savedSearchRepository = new InMemorySavedSearchRepository()
  sut = new SaveSearchFromMessageUseCase(
    scoutChatRepository,
    savedSearchRepository,
  )
})

describe('Save Search From Message Use Case', () => {
  it('should save the filters of that specific turn', async () => {
    const { messageId } = await seedTurn()

    const { savedSearch } = await sut.execute({
      messageId,
      userId: OBSERVER_ID,
      title: 'Meias sem empresário',
    })

    expect(savedSearch.title).toEqual('Meias sem empresário')
    expect(savedSearch.filters).toEqual(FILTERS)
    expect(savedSearchRepository.items).toHaveLength(1)
  })

  it('should mark the turn as saved so reopening reflects it', async () => {
    const { messageId } = await seedTurn()

    const { savedSearch } = await sut.execute({
      messageId,
      userId: OBSERVER_ID,
      title: 'Meias',
    })

    const message = await scoutChatRepository.findMessageById(messageId)
    const toolCall = message?.toolCall as ScoutMessageToolCall

    expect(toolCall.savedSearchId).toEqual(savedSearch.id)
    // O resto do toolCall não pode ser perdido na atualização.
    expect(toolCall.appliedFilters).toEqual(FILTERS)
    expect(toolCall.responseType).toEqual('ATHLETE_LIST')
  })

  it('should save each turn independently', async () => {
    const first = await seedTurn()
    const second = await scoutChatRepository.createMessage({
      threadId: first.threadId,
      role: 'ASSISTANT',
      content: 'Agora com os canhotos.',
      toolCall: {
        appliedFilters: { primaryPosition: 'MIDFIELDER', dominantFoot: 'LEFT' },
      },
    })

    await sut.execute({
      messageId: first.messageId,
      userId: OBSERVER_ID,
      title: 'Meias',
    })
    await sut.execute({
      messageId: second.id,
      userId: OBSERVER_ID,
      title: 'Meias canhotos',
    })

    expect(savedSearchRepository.items).toHaveLength(2)
    expect(savedSearchRepository.items[0]?.filters).toEqual(FILTERS)
    expect(savedSearchRepository.items[1]?.filters).toEqual({
      primaryPosition: 'MIDFIELDER',
      dominantFoot: 'LEFT',
    })
  })

  it('should persist the optional description', async () => {
    const { messageId } = await seedTurn()

    await sut.execute({
      messageId,
      userId: OBSERVER_ID,
      title: 'Meias',
      description: 'Para a base do sub-20',
    })

    expect(savedSearchRepository.items[0]?.description).toEqual(
      'Para a base do sub-20',
    )
  })

  it('should not save a message from another user', async () => {
    const { messageId } = await seedTurn({ userId: 'observer-2' })

    await expect(() =>
      sut.execute({ messageId, userId: OBSERVER_ID, title: 'Meias' }),
    ).rejects.toBeInstanceOf(ScoutMessageNotFoundError)

    expect(savedSearchRepository.items).toHaveLength(0)
  })

  it('should reject an unknown message', async () => {
    await expect(() =>
      sut.execute({
        messageId: 'nao-existe',
        userId: OBSERVER_ID,
        title: 'Meias',
      }),
    ).rejects.toBeInstanceOf(ScoutMessageNotFoundError)
  })

  it('should reject a turn that produced no search', async () => {
    // Turno em que a IA só perguntou algo — não há filtro para salvar.
    const { messageId } = await seedTurn({ appliedFilters: null })

    await expect(() =>
      sut.execute({ messageId, userId: OBSERVER_ID, title: 'Meias' }),
    ).rejects.toBeInstanceOf(ScoutMessageHasNoFiltersError)

    expect(savedSearchRepository.items).toHaveLength(0)
  })
})
