export class AthleteNotFoundError extends Error {
  constructor() {
    super('Athlete not found.')
  }
}
