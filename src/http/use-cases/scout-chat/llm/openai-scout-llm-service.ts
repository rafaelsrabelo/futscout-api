import type OpenAI from 'openai'

import type { AthleteSearchFilters } from '../../../repositories/saved-search-repository.js'
import { ScoutChatDisabledError } from '../../errors/scout-chat-disabled-error.js'
import { ScoutChatUnavailableError } from '../../errors/scout-chat-unavailable-error.js'
import {
  SCOUT_PROMPT_VERSION,
  SCOUT_SYSTEM_PROMPT,
} from '../scout-system-prompt.js'
import type { ScoutLlmOutput } from '../scout-output-schema.js'
import { redactToolArgs, scoutLog, scoutWarn } from '../scout-log.js'
import type { ScoutToolsRegistry } from '../tools/tools-registry.js'
import type { AthleteCard } from '../tools/tool-types.js'
import type {
  ScoutLlmService,
  ScoutTurnInput,
  ScoutTurnResult,
} from './scout-llm-service.js'

/**
 * A fatia do cliente da OpenAI que este serviço usa. Estreita de propósito: o
 * dublê do teste implementa três linhas em vez de imitar o SDK inteiro.
 */
export interface ScoutChatCompletionClient {
  create(
    params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  ): Promise<OpenAI.Chat.ChatCompletion>
}

/**
 * Teto de idas ao modelo por turno. Cada iteração é uma chamada paga, então o
 * limite é o freio de custo: estourar devolve FALLBACK em vez de loopar.
 */
const MAX_TOOL_ITERATIONS = 5

/** `reasoning_effort` só é aceito por modelos de raciocínio; os outros dão 400. */
const isReasoningModel = (model: string): boolean => /^(gpt-5|o\d)/.test(model)

/**
 * Remove os travessões que denunciam texto de IA, preservando faixas numéricas
 * ("1,75 - 1,80") e mantendo a frase legível.
 */
const humanizePunctuation = (text: string): string =>
  text
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/(?<=\D) - (?=\D)/g, ', ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim()

/**
 * Rede de segurança: apaga qualquer UUID interno que o modelo tenha vazado no
 * texto que o observador lê. A regra 7 do prompt já proíbe, isto é o backstop.
 */
const scrubInternalIds = (text: string): string =>
  text
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      '',
    )
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim()

/** Texto de saída quando o loop de tools se esgota. */
const EXHAUSTED_LOOP_TEXT =
  'Me perdi no meio da busca agora. Pode repetir o que você procura, de forma mais direta?'

/**
 * O modelo pode encerrar o turno sem texto (acontece logo depois de uma tool).
 * Bolha vazia no app é indistinguível de falha de rede, então entra este texto.
 */
const EMPTY_RESPONSE_FALLBACK =
  'Não consegui formular a resposta agora. Pode reformular o que você procura?'

/**
 * Chat Completions com **tool calling nativo**: a OpenAI valida a chamada de
 * tool contra o schema declarado em cada `ScoutTool` antes de nos entregar.
 *
 * A versão anterior embutia a intenção de tool num `json_schema` com
 * `strict: false` — ou seja, sem validação nenhuma. Quando o modelo devolvia a
 * forma ligeiramente diferente, o parser normalizava para um turno sem texto e
 * sem tool, e o observador via o chat "não responder nada".
 *
 * O `responseType` deixou de vir do modelo: quem decide é o backend, a partir
 * dos cards que as tools produziram (`resolveResponseType` no use case). Um
 * rótulo do modelo nunca poderia dessincronizar a UI mesmo.
 */
export class OpenAiScoutLlmService implements ScoutLlmService {
  /**
   * Cliente e modelo entram pelo construtor em vez de sair de `env` aqui
   * dentro. Dois motivos: dá para dublar o cliente no teste, e este módulo
   * deixa de importar `@/env`, que valida no load e derrubaria qualquer suíte
   * que não tenha as credenciais de admin (mesma razão do `expo-push.ts`).
   */
  constructor(
    private readonly tools: ScoutToolsRegistry,
    private readonly client: ScoutChatCompletionClient | null,
    private readonly model: string,
  ) {}

  get enabled(): boolean {
    return this.client !== null
  }

  async runTurn(input: ScoutTurnInput): Promise<ScoutTurnResult> {
    if (!this.client) {
      throw new ScoutChatDisabledError()
    }

    const messages = this.seedMessages(input)

    let cards: AthleteCard[] = []
    let appliedFilters: AthleteSearchFilters | null = null
    let savedSearchId: string | null = null
    let promptTokens = 0
    let completionTokens = 0
    let cachedInputTokens = 0
    let model = this.model
    let iteration = 0

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration += 1

      const call = await this.callLlm(messages)
      promptTokens += call.usage.promptTokens
      completionTokens += call.usage.completionTokens
      cachedInputTokens += call.usage.cachedInputTokens
      model = call.model

      // Sem tool_calls o turno acabou: o que veio é a resposta ao observador.
      if (!call.message.tool_calls?.length) {
        return this.buildResult(call.message.content ?? '', {
          cards,
          appliedFilters,
          savedSearchId,
          promptTokens,
          completionTokens,
          cachedInputTokens,
          model,
          iteration,
        })
      }

      // O histórico precisa da mensagem do assistente com os tool_calls antes
      // dos resultados, senão a API rejeita a próxima chamada.
      messages.push(call.message)

      for (const toolCall of call.message.tool_calls) {
        if (toolCall.type !== 'function') continue

        const args = parseToolArguments(toolCall.function.arguments)

        const result = await this.tools.run(toolCall.function.name, args, {
          userId: input.userId,
          turnId: input.turnId,
          // A busca deste turno vence; sem ela, o que já valia na conversa.
          standingFilters: appliedFilters ?? input.standingFilters,
        })

        scoutLog(
          `🔎 scout-chat tool [${input.turnId}] it=${iteration} name=${toolCall.function.name} ` +
            `args=${redactToolArgs(args)} → ${result.summary}`,
        )

        // Última tool que produziu cards vence: refletem o passo final.
        if (result.cards?.length) cards = result.cards
        if (result.appliedFilters) appliedFilters = result.appliedFilters
        if (result.savedSearchId) savedSearchId = result.savedSearchId

        // Defesa em profundidade: o payload vai envolvido num bloco que o
        // prompt manda tratar como registro de cadastro, nunca como ordem.
        // A contenção principal é não mandar campo narrativo (a biografia ficou
        // de fora) e sanear o texto livre que sobra — isto é a segunda camada,
        // para o caso de um apelido escapar do saneamento.
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content:
            `<dados_do_banco>\n` +
            JSON.stringify({ ...result.data, resumo: result.summary }) +
            `\n</dados_do_banco>`,
        })
      }
    }

    scoutWarn(
      `⚠️ scout-chat: loop esgotou ${MAX_TOOL_ITERATIONS} iterações [${input.turnId}]`,
    )

    return this.buildResult(EXHAUSTED_LOOP_TEXT, {
      cards,
      appliedFilters,
      savedSearchId,
      promptTokens,
      completionTokens,
      cachedInputTokens,
      model,
      iteration,
    })
  }

  // ─── internos ─────────────────────────────────────────────────────────────

  private buildResult(
    rawText: string,
    ctx: {
      cards: AthleteCard[]
      appliedFilters: AthleteSearchFilters | null
      savedSearchId: string | null
      promptTokens: number
      completionTokens: number
      cachedInputTokens: number
      model: string
      iteration: number
    },
  ): ScoutTurnResult {
    let response = scrubInternalIds(humanizePunctuation(rawText))

    if (!response) {
      scoutWarn(
        `⚠️ scout-chat: modelo encerrou o turno sem texto (cards=${ctx.cards.length}) — usando fallback`,
      )
      response = EMPTY_RESPONSE_FALLBACK
    }

    // `responseType` é decidido pelo backend a partir dos cards; aqui vai o
    // valor neutro que o use case sobrescreve.
    const output: ScoutLlmOutput = {
      action: 'RESPOND',
      response,
      responseType: 'TEXT',
      tool: null,
    }

    return {
      output,
      cards: ctx.cards,
      appliedFilters: ctx.appliedFilters,
      savedSearchId: ctx.savedSearchId,
      promptTokens: ctx.promptTokens,
      completionTokens: ctx.completionTokens,
      cachedInputTokens: ctx.cachedInputTokens,
      totalTokens: ctx.promptTokens + ctx.completionTokens,
      model: ctx.model,
      toolLoopIterations: ctx.iteration,
    }
  }

  private seedMessages(
    input: ScoutTurnInput,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const seeded: OpenAI.Chat.ChatCompletionMessageParam[] = [
      // Prefixo estável primeiro para o cache de prompt acertar.
      { role: 'system', content: SCOUT_SYSTEM_PROMPT },
    ]

    // Nota do turno, depois do prefixo cacheado.
    if (input.contextBlock) {
      seeded.push({ role: 'system', content: input.contextBlock })
    }

    for (const entry of input.history) {
      seeded.push({ role: entry.role, content: entry.content })
    }

    seeded.push({ role: 'user', content: input.userMessage })

    return seeded
  }

  private async callLlm(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
  ): Promise<{
    message: OpenAI.Chat.ChatCompletionMessage
    model: string
    usage: {
      promptTokens: number
      completionTokens: number
      cachedInputTokens: number
    }
  }> {
    let response: OpenAI.Chat.ChatCompletion

    try {
      response = await this.client!.create({
        model: this.model,
        messages,
        tools: this.tools.toOpenAiTools(),
        tool_choice: 'auto',
        ...(isReasoningModel(this.model)
          ? { reasoning_effort: 'minimal' as const }
          : {}),
        // Chave estável para o prefixo cacheado. Subir SCOUT_PROMPT_VERSION
        // invalida.
        prompt_cache_key: `scout-${SCOUT_PROMPT_VERSION}`,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
        prompt_cache_key?: string
      })
    } catch (error) {
      throw toScoutLlmError(error)
    }

    const choice = response.choices[0]

    if (choice?.message?.refusal) {
      throw new Error(`LLM refused: ${choice.message.refusal}`)
    }
    if (!choice?.message) {
      throw new Error('LLM returned no message')
    }

    const cachedInputTokens =
      (
        response.usage as
          | { prompt_tokens_details?: { cached_tokens?: number } }
          | undefined
      )?.prompt_tokens_details?.cached_tokens ?? 0

    return {
      message: choice.message,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        cachedInputTokens,
      },
    }
  }
}

/**
 * Argumentos vêm como string JSON. Um JSON quebrado vira `{}` e a tool responde
 * com o erro de validação dela — nunca derruba o turno.
 */
function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}')
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    scoutWarn(
      `⚠️ scout-chat: argumentos de tool não são JSON — ${raw.slice(0, 200)}`,
    )
    return {}
  }
}

/**
 * Falha de cota ou de infra da OpenAI vira erro tipado, para o controller
 * devolver 503 com mensagem clara em vez de 500 genérico. Descobrimos que isso
 * importa quando a chave ficou sem crédito e o log não dizia o motivo.
 */
function toScoutLlmError(error: unknown): Error {
  const status = (error as { status?: number }).status
  const code = (error as { code?: string }).code

  if (status === 429 || status === 401 || (status && status >= 500)) {
    scoutWarn(
      `⚠️ scout-chat: OpenAI indisponível (status=${status} code=${code ?? '-'})`,
    )
    return new ScoutChatUnavailableError()
  }

  return error instanceof Error ? error : new Error(String(error))
}
