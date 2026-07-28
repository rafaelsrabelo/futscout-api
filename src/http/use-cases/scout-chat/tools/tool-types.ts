/**
 * Contrato das tools do IAFutscore. Cada tool recebe argumentos crus vindos do
 * modelo — a validação com Zod acontece DENTRO da tool, antes de tocar no
 * banco: nada que o LLM produz chega ao Prisma sem passar por um schema.
 */

import type { AthleteSearchFilters } from '../../../repositories/saved-search-repository.js'

/** Card de atleta que o app renderiza. Montado no backend, nunca pelo modelo. */
export interface AthleteCard {
  id: string
  userId: string
  name: string
  nickname: string | null
  profilePhoto: string | null
  primaryPosition: string | null
  secondaryPosition: string | null
  age: number | null
  height: number | null
  weight: number | null
  dominantFoot: string | null
  currentClub: string | null
}

export interface ScoutToolContext {
  userId: string
  turnId: string
  /**
   * Critérios que a busca REALMENTE aplicou — do `search_athletes` deste turno
   * ou, se ele não rodou, do último turno que buscou. É a fonte de verdade do
   * `save_search`: assim o observador salva exatamente a busca que viu, em vez
   * de o modelo ter que relembrar e redigitar os filtros.
   */
  standingFilters: AthleteSearchFilters | null
}

export interface ScoutToolResult {
  /** Payload devolvido ao modelo para ele decidir o próximo passo. */
  data: Record<string, unknown>
  /** Resumo curto em texto, também enviado ao modelo e ao evento tool_end. */
  summary: string
  /** Cards para o app. Quando presentes, viram os `items` da resposta. */
  cards?: AthleteCard[]
  /** Filtros efetivamente aplicados, para o próximo turno poder refinar. */
  appliedFilters?: AthleteSearchFilters
  /** Id da SavedSearch criada, quando a tool salvou a busca. */
  savedSearchId?: string
}

export interface ScoutTool {
  readonly name: string
  readonly description: string
  execute(
    args: Record<string, unknown>,
    ctx: ScoutToolContext,
  ): Promise<ScoutToolResult>
}
