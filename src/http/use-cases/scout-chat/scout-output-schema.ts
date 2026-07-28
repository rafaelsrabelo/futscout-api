/**
 * Formato do turno depois de processado pelo backend.
 *
 * Já foi um JSON Schema que o modelo preenchia; hoje o tool calling nativo faz
 * esse papel e quem decide o `responseType` é o use case, a partir dos cards.
 */

export type ScoutResponseType =
  | 'TEXT'
  | 'ATHLETE_LIST'
  | 'ATHLETE_DETAIL'
  | 'SEARCH_SAVED'
  | 'CLARIFY'
  | 'FALLBACK'

export interface ScoutLlmOutput {
  action: 'CALL_TOOL' | 'RESPOND'
  response: string
  responseType: ScoutResponseType
  tool: {
    name: string
    arguments: Record<string, unknown>
  } | null
}
