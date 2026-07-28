import type { AthleteSearchFilters } from '../../../repositories/saved-search-repository.js'
import type { ScoutLlmOutput } from '../scout-output-schema.js'
import type { AthleteCard } from '../tools/tool-types.js'

export interface ScoutHistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

export interface ScoutTurnInput {
  userMessage: string
  history: ScoutHistoryEntry[]
  /**
   * Nota do turno: filtros que já estavam valendo e ids já mostrados. Entra
   * DEPOIS do prefixo estável para não quebrar o cache de prompt.
   */
  contextBlock: string
  userId: string
  turnId: string
  /**
   * Filtros que já valiam quando o turno começou. Viram a fonte de verdade do
   * `save_search` quando o observador manda salvar sem refazer a busca.
   */
  standingFilters: AthleteSearchFilters | null
}

export interface ScoutTurnResult {
  output: ScoutLlmOutput
  /** Cards vindos das tools — montados no backend, nunca pelo modelo. */
  cards: AthleteCard[]
  /** Critérios que a busca realmente aplicou neste turno. */
  appliedFilters: AthleteSearchFilters | null
  savedSearchId: string | null
  promptTokens: number
  completionTokens: number
  cachedInputTokens: number
  totalTokens: number
  model: string
  toolLoopIterations: number
}

/**
 * Abstração para o use case poder ser testado com um dublê, sem rede.
 * A implementação de produção é `OpenAiScoutLlmService`.
 */
export interface ScoutLlmService {
  readonly enabled: boolean
  runTurn(input: ScoutTurnInput): Promise<ScoutTurnResult>
}
