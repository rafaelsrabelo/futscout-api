export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('Email já está em uso por outro usuário.')
  }
}
