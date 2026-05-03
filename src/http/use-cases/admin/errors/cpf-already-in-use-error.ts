export class CpfAlreadyInUseError extends Error {
  constructor() {
    super('CPF já está em uso por outro usuário.')
  }
}
