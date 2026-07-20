export class TooManyAttemptsError extends Error {
  constructor() {
    super('Muitas tentativas inválidas. Solicite um novo código.')
  }
}
