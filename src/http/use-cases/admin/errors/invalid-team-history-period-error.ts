export class InvalidTeamHistoryPeriodError extends Error {
  constructor() {
    super('Data de término deve ser posterior à data de início.')
  }
}
