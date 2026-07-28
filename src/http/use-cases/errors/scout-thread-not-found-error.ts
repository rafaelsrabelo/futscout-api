/**
 * Também usado quando a thread existe mas é de outro usuário — não distinguimos
 * "não existe" de "não é sua" para não vazar a existência de conversa alheia.
 */
export class ScoutThreadNotFoundError extends Error {
  constructor() {
    super('Scout thread not found.')
  }
}
