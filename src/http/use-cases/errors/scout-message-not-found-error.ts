/**
 * Também usado quando a mensagem existe mas pertence à conversa de outro
 * usuário — não distinguimos, para não vazar a existência de conversa alheia.
 */
export class ScoutMessageNotFoundError extends Error {
  constructor() {
    super('Scout message not found.')
  }
}
