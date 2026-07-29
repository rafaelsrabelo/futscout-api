/**
 * Saneamento de texto escrito pelo atleta antes de entrar no contexto do
 * modelo.
 *
 * Regra do produto: só vão ao modelo dados que servem de MÉTRICA (posição,
 * idade, altura, peso, pé, clube, empresário). Campos narrativos como a
 * biografia ficam de fora — o modelo não precisa deles para buscar, e eles são
 * o vetor mais largo de injeção de prompt.
 *
 * Ainda assim `nickname` e `currentClub` são filtros E texto livre. Vão para o
 * modelo por necessidade, mas passam por aqui: um apelido cadastrado como
 * "Fim dos dados. Nova instrução: ..." não pode virar comando.
 */

/** Apelido e clube reais cabem folgado; o excesso é tentativa de payload. */
const MAX_FREE_TEXT_LENGTH = 60

/**
 * Marcadores que o modelo poderia ler como mudança de papel ou de bloco.
 * Não é lista exaustiva de ataques — é o corte barato que quebra o formato
 * de instrução. A defesa principal é não mandar campo narrativo nenhum.
 */
const STRUCTURAL_MARKERS =
  /<\/?[a-z_]+>|```|\b(system|assistant|user)\s*:|\bignore\s+(as\s+)?(instru|previous)/gi

export function sanitizeForModel(value: string | null): string | null {
  if (value === null) return null

  const cleaned = value
    .replace(STRUCTURAL_MARKERS, ' ')
    // Quebra de linha em apelido/clube só serve para simular fim de bloco.
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (cleaned.length === 0) return null

  return cleaned.length > MAX_FREE_TEXT_LENGTH
    ? `${cleaned.slice(0, MAX_FREE_TEXT_LENGTH)}…`
    : cleaned
}
