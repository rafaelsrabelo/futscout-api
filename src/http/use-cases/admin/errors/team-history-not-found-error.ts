export class TeamHistoryNotFoundError extends Error {
  constructor() {
    super('Histórico de time não encontrado.')
  }
}
