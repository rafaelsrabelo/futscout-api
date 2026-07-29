import { beforeEach, describe, expect, it } from 'vitest'
import type OpenAI from 'openai'
import { ScoutChatDisabledError } from '../../errors/scout-chat-disabled-error.js'
import { ScoutChatUnavailableError } from '../../errors/scout-chat-unavailable-error.js'
import type {
  ScoutTool,
  ScoutToolContext,
  ScoutToolResult,
} from '../tools/tool-types.js'
import { ScoutToolsRegistry } from '../tools/tools-registry.js'
import {
  OpenAiScoutLlmService,
  type ScoutChatCompletionClient,
} from './openai-scout-llm-service.js'
import type { ScoutTurnInput } from './scout-llm-service.js'

const MODEL = 'gpt-4o-mini'

/** Cliente dublê: devolve respostas enfileiradas e guarda o que recebeu. */
class FakeChatClient implements ScoutChatCompletionClient {
  public calls: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming[] = []
  private queue: OpenAI.Chat.ChatCompletion[] = []
  private failure: unknown = null

  enqueueText(content: string | null) {
    this.queue.push(makeCompletion({ content }))
  }

  enqueueToolCall(name: string, args: string, id = 'call-1') {
    this.queue.push(
      makeCompletion({
        content: null,
        tool_calls: [
          { id, type: 'function', function: { name, arguments: args } },
        ],
      }),
    )
  }

  failWith(error: unknown) {
    this.failure = error
  }

  async create(params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) {
    this.calls.push(params)

    if (this.failure) throw this.failure

    const next = this.queue.shift()
    if (!next) throw new Error('FakeChatClient: nenhuma resposta enfileirada')

    return next
  }
}

function makeCompletion(
  message: Partial<OpenAI.Chat.ChatCompletionMessage>,
): OpenAI.Chat.ChatCompletion {
  return {
    id: 'chatcmpl-1',
    object: 'chat.completion',
    created: 0,
    model: MODEL,
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        logprobs: null,
        message: {
          role: 'assistant',
          content: null,
          refusal: null,
          ...message,
        } as OpenAI.Chat.ChatCompletionMessage,
      },
    ],
    usage: { prompt_tokens: 900, completion_tokens: 50, total_tokens: 950 },
  } as OpenAI.Chat.ChatCompletion
}

/** Tool controlável, para o teste decidir o que ela devolve. */
class FakeTool implements ScoutTool {
  public receivedArgs: Record<string, unknown>[] = []
  public receivedCtx: ScoutToolContext[] = []
  readonly parameters = { type: 'object', properties: {} }

  constructor(
    readonly name: string,
    readonly description: string,
    private readonly result: ScoutToolResult,
  ) {}

  async execute(args: Record<string, unknown>, ctx: ScoutToolContext) {
    this.receivedArgs.push(args)
    this.receivedCtx.push(ctx)
    return this.result
  }
}

const CARD = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  name: 'Atleta Teste',
  nickname: 'Testinho',
  profilePhoto: null,
  primaryPosition: 'MIDFIELDER',
  secondaryPosition: null,
  age: 19,
  height: 1.75,
  weight: 70,
  dominantFoot: 'RIGHT',
  currentClub: 'Ceará',
}

function makeInput(overrides: Partial<ScoutTurnInput> = {}): ScoutTurnInput {
  return {
    userMessage: 'meio-campistas sem empresário',
    history: [],
    contextBlock: '',
    userId: 'observer-1',
    turnId: 'turn-1',
    standingFilters: null,
    ...overrides,
  }
}

function makeSut(tools: ScoutTool[], client: FakeChatClient) {
  return new OpenAiScoutLlmService(new ScoutToolsRegistry(tools), client, MODEL)
}

let client: FakeChatClient
let searchTool: FakeTool

beforeEach(() => {
  client = new FakeChatClient()
  searchTool = new FakeTool('search_athletes', 'busca atletas', {
    data: { total: 12, athletes: [{ athleteId: CARD.id }] },
    summary: '12 atleta(s) encontrado(s), mostrando 1.',
    cards: [CARD],
    appliedFilters: { primaryPosition: 'MIDFIELDER', hasManager: false },
  })
})

describe('OpenAiScoutLlmService', () => {
  it('should return the text when the model answers without tools', async () => {
    client.enqueueText('Que posição você procura?')
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.output.response).toEqual('Que posição você procura?')
    expect(result.toolLoopIterations).toEqual(1)
    expect(result.cards).toHaveLength(0)
  })

  it('should run the requested tool and iterate', async () => {
    client.enqueueToolCall(
      'search_athletes',
      '{"primaryPosition":"MIDFIELDER","hasManager":false}',
    )
    client.enqueueText('Achei 12 meias sem empresário.')
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(searchTool.receivedArgs[0]).toEqual({
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
    })
    expect(result.output.response).toEqual('Achei 12 meias sem empresário.')
    expect(result.cards).toHaveLength(1)
    expect(result.appliedFilters).toEqual({
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
    })
    expect(result.toolLoopIterations).toEqual(2)
  })

  it('should feed the tool result back inside a data block', async () => {
    client.enqueueToolCall('search_athletes', '{}')
    client.enqueueText('Pronto.')
    const sut = makeSut([searchTool], client)

    await sut.runTurn(makeInput())

    // Segunda chamada carrega o histórico com o resultado da tool.
    const second = client.calls[1]
    const toolMessage = second.messages.find((m) => m.role === 'tool')
    expect(toolMessage?.content).toContain('<dados_do_banco>')
    expect(toolMessage?.content).toContain('</dados_do_banco>')
  })

  it('should send the assistant tool_calls message before the tool result', async () => {
    client.enqueueToolCall('search_athletes', '{}')
    client.enqueueText('Pronto.')
    const sut = makeSut([searchTool], client)

    await sut.runTurn(makeInput())

    // A API rejeita um `tool` que não venha logo após o `assistant` que pediu.
    const roles = client.calls[1].messages.map((m) => m.role)
    expect(roles.indexOf('assistant')).toBeLessThan(roles.indexOf('tool'))
  })

  it('should pass the standing filters to the tool', async () => {
    client.enqueueToolCall('search_athletes', '{}')
    client.enqueueText('Pronto.')
    const sut = makeSut([searchTool], client)

    await sut.runTurn(
      makeInput({ standingFilters: { primaryPosition: 'FORWARD' } }),
    )

    expect(searchTool.receivedCtx[0]?.standingFilters).toEqual({
      primaryPosition: 'FORWARD',
    })
  })

  it('should survive malformed tool arguments', async () => {
    client.enqueueToolCall('search_athletes', 'isto não é json')
    client.enqueueText('Pronto.')
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    // Vira `{}` e a tool responde o erro de validação dela — não derruba o turno.
    expect(searchTool.receivedArgs[0]).toEqual({})
    expect(result.output.response).toEqual('Pronto.')
  })

  it('should not blow up when the model asks for an unknown tool', async () => {
    client.enqueueToolCall('tool_que_nao_existe', '{}')
    client.enqueueText('Desculpe, me confundi.')
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.output.response).toEqual('Desculpe, me confundi.')
  })

  it('should replace an empty answer with a fallback', async () => {
    // Foi o sintoma real em produção: 200 com bolha vazia no app.
    client.enqueueText('')
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.output.response.length).toBeGreaterThan(0)
    expect(result.output.response).toContain('reformular')
  })

  it('should give up gracefully when the tool loop never settles', async () => {
    // Modelo teimoso: pede tool em todas as iterações.
    for (let i = 0; i < 6; i += 1) {
      client.enqueueToolCall('search_athletes', '{}', `call-${i}`)
    }
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.toolLoopIterations).toEqual(5)
    expect(result.output.response).toContain('Me perdi')
    // Os cards da última busca sobrevivem ao fallback.
    expect(result.cards).toHaveLength(1)
  })

  it('should keep the cards from the last tool that produced them', async () => {
    const emptyTool = new FakeTool('save_search', 'salva', {
      data: { savedSearchId: 'saved-1' },
      summary: 'Busca salva.',
      savedSearchId: 'saved-1',
    })
    client.enqueueToolCall('search_athletes', '{}', 'call-1')
    client.enqueueToolCall('save_search', '{"title":"Meias"}', 'call-2')
    client.enqueueText('Salvei.')
    const sut = makeSut([searchTool, emptyTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.cards).toHaveLength(1)
    expect(result.savedSearchId).toEqual('saved-1')
  })

  it('should scrub an internal id leaked into the answer', async () => {
    client.enqueueText(`O atleta ${CARD.id} é o mais alto.`)
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.output.response).not.toContain(CARD.id)
  })

  it('should sum the token usage across iterations', async () => {
    client.enqueueToolCall('search_athletes', '{}')
    client.enqueueText('Pronto.')
    const sut = makeSut([searchTool], client)

    const result = await sut.runTurn(makeInput())

    expect(result.promptTokens).toEqual(1800)
    expect(result.completionTokens).toEqual(100)
    expect(result.totalTokens).toEqual(1900)
  })

  it('should declare the tools to the API', async () => {
    client.enqueueText('Oi.')
    const sut = makeSut([searchTool], client)

    await sut.runTurn(makeInput())

    const tools = client.calls[0].tools
    expect(tools).toHaveLength(1)
    expect(tools?.[0]).toMatchObject({
      type: 'function',
      function: { name: 'search_athletes' },
    })
  })

  it('should put the context block after the stable prefix', async () => {
    client.enqueueText('Oi.')
    const sut = makeSut([searchTool], client)

    await sut.runTurn(makeInput({ contextBlock: 'Hoje é 28 de julho.' }))

    // Ordem importa: o prefixo estável primeiro, senão o cache de prompt não bate.
    const messages = client.calls[0].messages
    expect(messages[0]?.role).toEqual('system')
    expect(messages[1]?.content).toContain('Hoje é 28 de julho.')
  })

  it('should turn a quota error into ScoutChatUnavailableError', async () => {
    client.failWith(Object.assign(new Error('429'), { status: 429 }))
    const sut = makeSut([searchTool], client)

    await expect(() => sut.runTurn(makeInput())).rejects.toBeInstanceOf(
      ScoutChatUnavailableError,
    )
  })

  it('should turn an auth error into ScoutChatUnavailableError', async () => {
    client.failWith(Object.assign(new Error('401'), { status: 401 }))
    const sut = makeSut([searchTool], client)

    await expect(() => sut.runTurn(makeInput())).rejects.toBeInstanceOf(
      ScoutChatUnavailableError,
    )
  })

  it('should refuse to run without an API key', async () => {
    const sut = new OpenAiScoutLlmService(
      new ScoutToolsRegistry([searchTool]),
      null,
      MODEL,
    )

    expect(sut.enabled).toBe(false)
    await expect(() => sut.runTurn(makeInput())).rejects.toBeInstanceOf(
      ScoutChatDisabledError,
    )
  })
})
