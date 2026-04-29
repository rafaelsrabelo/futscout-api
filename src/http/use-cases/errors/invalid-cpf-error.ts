export class InvalidCpfError extends Error {
  constructor() {
    super('CPF inválido.')
    this.name = 'InvalidCpfError'
  }
}
