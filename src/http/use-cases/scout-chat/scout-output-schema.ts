/**
 * Schema JSON que o modelo preenche a cada turno.
 * `action=CALL_TOOL` executa a tool e itera; `action=RESPOND` encerra o turno.
 *
 * Ao alterar este schema, suba SCOUT_PROMPT_VERSION — ela é a chave do cache
 * de prompt da OpenAI e precisa invalidar junto.
 */

export const SCOUT_OUTPUT_JSON_SCHEMA = {
  name: 'scout_output',
  // `strict: false` de propósito: o modo estrito da OpenAI proíbe o
  // `tool.arguments` livre que este schema precisa. A defesa fica no
  // JSON.parse defensivo + validação Zod dentro de cada tool.
  strict: false,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['action', 'response', 'responseType', 'tool'],
    properties: {
      action: { type: 'string', enum: ['CALL_TOOL', 'RESPOND'] },

      // Texto que o observador lê, sempre presente.
      response: { type: 'string' },

      // Dica de renderização para o app.
      responseType: {
        type: 'string',
        enum: [
          'TEXT',
          'ATHLETE_LIST',
          'ATHLETE_DETAIL',
          'SEARCH_SAVED',
          'CLARIFY',
          'FALLBACK',
        ],
      },

      // Só usado quando action=CALL_TOOL; `name` precisa bater com o registry.
      tool: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'arguments'],
            properties: {
              name: { type: 'string' },
              arguments: {
                type: 'object',
                additionalProperties: true,
                properties: {},
              },
            },
          },
          { type: 'null' },
        ],
      },
    },
  },
} as const

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
