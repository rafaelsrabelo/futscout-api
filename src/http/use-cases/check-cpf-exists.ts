import type { UsersRepository } from '../repositories/users-repository.js'

export class CheckCpfExistsUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute(cpf: string): Promise<{ exists: boolean }> {
    const user = await this.usersRepository.findByCpf(cpf)
    return { exists: !!user }
  }
}
