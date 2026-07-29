/**
 * Log do chat de busca. Existe porque o modo de falha desta feature é "o modelo
 * fez algo inesperado", e isso é invisível nos logs de HTTP: um turno que
 * responde sem buscar devolve 200 igual a um que achou 800 atletas.
 *
 * Silenciado em `test` para não afogar a saída do Vitest — em produção sai no
 * stdout, que é o que o Render captura.
 */
const isTest = process.env.NODE_ENV === 'test'

export function scoutLog(message: string): void {
  if (isTest) return
  console.log(message)
}

export function scoutWarn(message: string): void {
  if (isTest) return
  console.warn(message)
}

/**
 * Campos de busca que carregam nome de pessoa. 91% da base é menor de idade,
 * então o nome pesquisado não vai para o log do Render — o resto dos filtros
 * (posição, idade, altura) não identifica ninguém e é o que dá diagnóstico.
 */
const PERSONAL_ARG_KEYS = new Set(['name', 'nickname'])

export function redactToolArgs(args: Record<string, unknown>): string {
  const safe: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(args)) {
    safe[key] = PERSONAL_ARG_KEYS.has(key) ? '[omitido]' : value
  }

  return JSON.stringify(safe)
}
