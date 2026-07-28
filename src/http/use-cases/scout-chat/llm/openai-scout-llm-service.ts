import OpenAI from 'openai'

import { env } from '@/env/index.js'
import type { AthleteSearchFilters } from '../../../repositories/saved-search-repository.js'
import { ScoutChatDisabledError } from '../../errors/scout-chat-disabled-error.js'
import {
  SCOUT_PROMPT_VERSION,
  SCOUT_SYSTEM_PROMPT,
} from '../scout-system-prompt.js'
import {
  SCOUT_OUTPUT_JSON_SCHEMA,
  type ScoutLlmOutput,
} from '../scout-output-schema.js'
import type { ScoutToolsRegistry } from '../tools/tools-registry.js'
import type { AthleteCard, ScoutToolResult } from '../tools/tool-types.js'
import type {
  ScoutLlmService,
  ScoutTurnInput,
  ScoutTurnResult,
} from './scout-llm-service.js'

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

/** Resposta de saída quando o loop de tools se esgota. */
const FALLBACK_OUTPUT: ScoutLlmOutput = {
  action: 'RESPOND',
  response:
    'Me perdi no meio da busca agora. Pode repetir o que você procura, de forma mais direta?',
  responseType: 'FALLBACK',
  tool: null,
}

/**
 * Chat Completions com structured output + loop de tools sintético: a cada
 * iteração o modelo devolve JSON no formato de `SCOUT_OUTPUT_JSON_SCHEMA`
 * (`CALL_TOOL` → executa e itera, `RESPOND` → encerra).
 *
 * A intenção de tool viaja dentro do próprio schema em vez do parâmetro nativo
 * `tools` porque Chat Completions não aceita json_schema e tools na mesma
 * chamada.
 */
export class OpenAiScoutLlmService implements ScoutLlmService {
  private client: OpenAI | null

  constructor(private tools: ScoutToolsRegistry) {
    this.client = env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
      : null
  }

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
    let model = env.AI_CHAT_MODEL
    let iteration = 0

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration += 1

      const call = await this.callLlm(messages)
      promptTokens += call.usage.promptTokens
      completionTokens += call.usage.completionTokens
      cachedInputTokens += call.usage.cachedInputTokens
      model = call.model

      const toolCall =
        call.parsed.action === 'CALL_TOOL' ? call.parsed.tool : null

      // RESPOND — ou CALL_TOOL sem tool preenchida, que tratamos como resposta.
      if (!toolCall) {
        return this.buildResult(call.parsed, {
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

      const result = await this.tools.run(toolCall.name, toolCall.arguments, {
        userId: input.userId,
        turnId: input.turnId,
        // A busca deste turno vence; sem ela, o que já valia na conversa.
        standingFilters: appliedFilters ?? input.standingFilters,
      })

      // Última tool que produziu cards vence: os cards refletem o passo final.
      if (result.cards?.length) cards = result.cards
      if (result.appliedFilters) appliedFilters = result.appliedFilters
      if (result.savedSearchId) savedSearchId = result.savedSearchId

      this.appendToolTurn(messages, call.parsed, toolCall.name, result)
    }

    return this.buildResult(FALLBACK_OUTPUT, {
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
    output: ScoutLlmOutput,
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
      // Prefixo estável primeiro (prompt + tools) para o cache acertar.
      { role: 'system', content: SCOUT_SYSTEM_PROMPT },
      { role: 'system', content: this.tools.describe() },
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

  private appendToolTurn(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    parsed: ScoutLlmOutput,
    toolName: string,
    result: ScoutToolResult,
  ): void {
    // Devolve o JSON do assistente + o resultado da tool para a próxima iteração.
    messages.push({ role: 'assistant', content: JSON.stringify(parsed) })
    messages.push({
      role: 'system',
      content:
        `Resultado da tool "${toolName}":\n` +
        JSON.stringify(result.data) +
        (result.summary ? `\n\nResumo: ${result.summary}` : ''),
    })
  }

  private async callLlm(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
  ): Promise<{
    parsed: ScoutLlmOutput
    model: string
    usage: {
      promptTokens: number
      completionTokens: number
      cachedInputTokens: number
    }
  }> {
    const response = await this.client!.chat.completions.create({
      model: env.AI_CHAT_MODEL,
      messages,
      ...(isReasoningModel(env.AI_CHAT_MODEL)
        ? { reasoning_effort: 'minimal' as const }
        : {}),
      response_format: {
        type: 'json_schema',
        json_schema: SCOUT_OUTPUT_JSON_SCHEMA,
      },
      // Chave única e estável: toda chamada acerta o cache quente com o nosso
      // prefixo (input muito mais barato). Subir SCOUT_PROMPT_VERSION invalida.
      prompt_cache_key: `scout-${SCOUT_PROMPT_VERSION}`,
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
      prompt_cache_key?: string
    })

    const choice = response.choices[0]

    if (choice?.message?.refusal) {
      throw new Error(`LLM refused: ${choice.message.refusal}`)
    }
    if (!choice?.message?.content) {
      throw new Error('LLM returned empty content')
    }

    let parsed: ScoutLlmOutput
    try {
      parsed = JSON.parse(choice.message.content) as ScoutLlmOutput
    } catch {
      throw new Error('LLM returned malformed JSON')
    }

    // `strict: false` no schema permite o modelo omitir campos — completa aqui.
    parsed.tool ??= null
    parsed.responseType ??= 'TEXT'
    parsed.response = scrubInternalIds(
      humanizePunctuation(parsed.response ?? ''),
    )

    // Tool sem nome não é chamada válida; vira resposta em vez de quebrar.
    if (parsed.tool && typeof parsed.tool.name !== 'string') {
      parsed.tool = null
    }
    if (parsed.tool) {
      parsed.tool.arguments ??= {}
    }

    const cachedInputTokens =
      (
        response.usage as
          | { prompt_tokens_details?: { cached_tokens?: number } }
          | undefined
      )?.prompt_tokens_details?.cached_tokens ?? 0

    return {
      parsed,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        cachedInputTokens,
      },
    }
  }
}
