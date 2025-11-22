export class InvalidCpfError extends Error {
  constructor() {
    super('Invalid CPF format')
    this.name = 'InvalidCpfError'
  }
}

