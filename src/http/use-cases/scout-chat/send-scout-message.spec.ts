import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryScoutChatRepository } from '../../repositories/in-memory/in-memory-scout-chat-repository.js'
import type { AthleteSearchFilters } from '../../repositories/saved-search-repository.js'
import type { ScoutMessageToolCall } from '../../repositories/scout-chat-repository.js'
import { ScoutThreadNotFoundError } from '../errors/scout-thread-not-found-error.js'
import type {
  ScoutLlmService,
  ScoutTurnInput,
  ScoutTurnResult,
} from './llm/scout-llm-service.js'
import type { ScoutResponseType } from './scout-output-schema.js'
import { SendScoutMessageUseCase } from './send-scout-message.js'
import type { AthleteCard } from './tools/tool-types.js'

interface EnqueuedTurn {
  response?: string
  responseType?: ScoutResponseType
  cards?: AthleteCard[]
  appliedFilters?: AthleteSearchFilters | null
  savedSearchId?: string | null
}

/**
 * Dublê do LLM: devolve turnos pré-programados e guarda o que recebeu, para os
 * testes afirmarem sobre o histórico e o contexto montados pelo use case.
 */
class FakeScoutLlmService implements ScoutLlmService {
  public enabled = true
  public calls: ScoutTurnInput[] = []
  private queue: ScoutTurnResult[] = []

  enqueue(turn: EnqueuedTurn = {}) {
    this.queue.push({
      output: {
        action: 'RESPOND',
        response: turn.response ?? 'Beleza.',
        responseType: turn.responseType ?? 'TEXT',
        tool: null,
      },
      cards: turn.cards ?? [],
      appliedFilters: turn.appliedFilters ?? null,
      savedSearchId: turn.savedSearchId ?? null,
      promptTokens: 100,
      completionTokens: 20,
      cachedInputTokens: 80,
      totalTokens: 120,
      model: 'gpt-4o-mini',
      toolLoopIterations: 1,
    })
  }

  async runTurn(input: ScoutTurnInput): Promise<ScoutTurnResult> {
    this.calls.push(input)

    const next = this.queue.shift()

    if (!next) {
      throw new Error('FakeScoutLlmService: nenhum turno enfileirado')
    }

    return next
  }
}

function makeCard(overrides: Partial<AthleteCard> = {}): AthleteCard {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: '22222222-2222-2222-2222-222222222222',
    name: 'Atleta Teste',
    nickname: 'Testinho',
    profilePhoto: null,
    primaryPosition: 'FORWARD',
    secondaryPosition: null,
    age: 19,
    height: 1.8,
    weight: 75,
    dominantFoot: 'LEFT',
    currentClub: 'Ceará',
    ...overrides,
  }
}

const OBSERVER_ID = 'observer-1'

let scoutChatRepository: InMemoryScoutChatRepository
let llm: FakeScoutLlmService
let sut: SendScoutMessageUseCase

beforeEach(() => {
  scoutChatRepository = new InMemoryScoutChatRepository()
  llm = new FakeScoutLlmService()
  sut = new SendScoutMessageUseCase(scoutChatRepository, llm)
})

describe('Send Scout Message Use Case', () => {
  it('should open a new thread and persist both sides of the turn', async () => {
    llm.enqueue({
      response: 'Que posição você procura?',
      responseType: 'CLARIFY',
    })

    const result = await sut.execute({
      userId: OBSERVER_ID,
      message: 'quero um jogador',
    })

    expect(result.threadId).toEqual(expect.any(String))
    expect(result.response).toEqual('Que posição você procura?')
    expect(result.responseType).toEqual('CLARIFY')

    const messages = await scoutChatRepository.findMessagesByThreadId(
      result.threadId,
    )
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({
      role: 'USER',
      content: 'quero um jogador',
    })
    expect(messages[1]).toMatchObject({
      role: 'ASSISTANT',
      content: 'Que posição você procura?',
      totalTokens: 120,
    })
  })

  it('should title the thread after the first message', async () => {
    llm.enqueue()

    const { threadId } = await sut.execute({
      userId: OBSERVER_ID,
      message: '  atacante   canhoto  sub-20 ',
    })

    const thread = await scoutChatRepository.findThreadById(threadId)
    expect(thread?.title).toEqual('atacante canhoto sub-20')
  })

  it('should keep the original title on later messages', async () => {
    llm.enqueue()
    const { threadId } = await sut.execute({
      userId: OBSERVER_ID,
      message: 'atacante canhoto',
    })

    llm.enqueue()
    await sut.execute({
      userId: OBSERVER_ID,
      message: 'agora abre a idade',
      threadId,
    })

    const thread = await scoutChatRepository.findThreadById(threadId)
    expect(thread?.title).toEqual('atacante canhoto')
  })

  it('should not allow reading a thread from another user', async () => {
    const otherThread = await scoutChatRepository.createThread({
      userId: 'observer-2',
    })

    await expect(() =>
      sut.execute({
        userId: OBSERVER_ID,
        message: 'oi',
        threadId: otherThread.id,
      }),
    ).rejects.toBeInstanceOf(ScoutThreadNotFoundError)
  })

  it('should persist cards and applied filters from the turn', async () => {
    const filters: AthleteSearchFilters = {
      primaryPosition: 'FORWARD',
      dominantFoot: 'LEFT',
      maxAge: 20,
    }
    llm.enqueue({
      responseType: 'ATHLETE_LIST',
      cards: [
        makeCard(),
        makeCard({ id: '33333333-3333-3333-3333-333333333333' }),
      ],
      appliedFilters: filters,
    })

    const result = await sut.execute({
      userId: OBSERVER_ID,
      message: 'atacante canhoto sub-20',
    })

    expect(result.items).toHaveLength(2)
    expect(result.appliedFilters).toEqual(filters)

    const messages = await scoutChatRepository.findMessagesByThreadId(
      result.threadId,
    )
    const assistant = messages[1]
    expect(assistant.cards).toHaveLength(2)
    expect((assistant.toolCall as ScoutMessageToolCall).appliedFilters).toEqual(
      filters,
    )
    expect(
      (assistant.toolCall as ScoutMessageToolCall).shownAthleteIds,
    ).toEqual([
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
    ])
  })

  it('should feed the previous filters and shown ids back to the model', async () => {
    llm.enqueue({
      cards: [makeCard()],
      appliedFilters: { primaryPosition: 'FORWARD', maxAge: 20 },
    })
    const { threadId } = await sut.execute({
      userId: OBSERVER_ID,
      message: 'atacante sub-20',
    })

    llm.enqueue()
    await sut.execute({
      userId: OBSERVER_ID,
      message: 'pode abrir até 22',
      threadId,
    })

    const secondCall = llm.calls[1]
    expect(secondCall.contextBlock).toContain('"primaryPosition":"FORWARD"')
    expect(secondCall.contextBlock).toContain('"maxAge":20')
    expect(secondCall.contextBlock).toContain(
      '11111111-1111-1111-1111-111111111111',
    )
  })

  it('should carry the standing filters when the turn only talked', async () => {
    llm.enqueue({ appliedFilters: { primaryPosition: 'DEFENDER' } })
    const { threadId } = await sut.execute({
      userId: OBSERVER_ID,
      message: 'zagueiros',
    })

    // Turno sem tool: o modelo apenas respondeu, sem refazer a busca.
    llm.enqueue({ appliedFilters: null })
    const result = await sut.execute({
      userId: OBSERVER_ID,
      message: 'e dá pra filtrar por velocidade?',
      threadId,
    })

    expect(result.appliedFilters).toEqual({ primaryPosition: 'DEFENDER' })
  })

  it('should send history without repeating the current question', async () => {
    llm.enqueue({ response: 'Achei 3.' })
    const { threadId } = await sut.execute({
      userId: OBSERVER_ID,
      message: 'zagueiros',
    })

    llm.enqueue()
    await sut.execute({
      userId: OBSERVER_ID,
      message: 'e canhotos?',
      threadId,
    })

    const secondCall = llm.calls[1]
    expect(secondCall.userMessage).toEqual('e canhotos?')
    expect(secondCall.history).toEqual([
      { role: 'user', content: 'zagueiros' },
      { role: 'assistant', content: 'Achei 3.' },
    ])
  })

  it('should downgrade an athlete list with no cards to plain text', async () => {
    // O modelo erra o rótulo; sem card não existe lista para o app renderizar.
    llm.enqueue({ responseType: 'ATHLETE_LIST', cards: [] })

    const result = await sut.execute({
      userId: OBSERVER_ID,
      message: 'atacantes',
    })

    expect(result.responseType).toEqual('TEXT')
  })

  it('should report SEARCH_SAVED when the turn saved a search', async () => {
    llm.enqueue({
      responseType: 'TEXT',
      savedSearchId: 'saved-1',
      appliedFilters: { primaryPosition: 'MIDFIELDER' },
    })

    const result = await sut.execute({
      userId: OBSERVER_ID,
      message: 'salva essa busca como Meias Ceará',
    })

    expect(result.responseType).toEqual('SEARCH_SAVED')
    expect(result.savedSearchId).toEqual('saved-1')
  })

  it('should keep ATHLETE_DETAIL when a single card was requested', async () => {
    llm.enqueue({ responseType: 'ATHLETE_DETAIL', cards: [makeCard()] })

    const result = await sut.execute({
      userId: OBSERVER_ID,
      message: 'me fala mais do Testinho',
    })

    expect(result.responseType).toEqual('ATHLETE_DETAIL')
  })
})
