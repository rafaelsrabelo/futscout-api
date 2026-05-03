export class NicknameAlreadyInUseError extends Error {
  constructor() {
    super('Nickname já está em uso por outro atleta.')
  }
}
