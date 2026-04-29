export class RecoveryValidationError extends Error {
  constructor() {
    super('CPF e data de nascimento não conferem.')
  }
}
