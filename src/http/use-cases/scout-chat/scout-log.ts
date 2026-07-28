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
