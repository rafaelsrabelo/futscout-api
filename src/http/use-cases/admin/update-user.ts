import { normalizeCpf, validateCpf } from '../../../utils/validateCpf.js'
import type { UsersRepository } from '../../repositories/users-repository.js'
import type { User, UserRole } from 'generated/prisma/client.js'

import { CpfAlreadyExistsError } from '../errors/cpf-already-exists-error.js'
import { EmailAlreadyExistsError } from '../errors/email-already-exists-error.js'
import { InvalidCpfError } from '../errors/invalid-cpf-error.js'
import { UserNotFoundError } from './errors/user-not-found-error.js'

export interface UpdateUserAdminUseCaseRequest {
  userId: string
  name?: string
  email?: string
  cpf?: string | null
  role?: UserRole | null
  isActive?: boolean
  emailVerified?: boolean
  isImported?: boolean
}

export class UpdateUserAdminUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
    name,
    email,
    cpf,
    role,
    isActive,
    emailVerified,
    isImported,
  }: UpdateUserAdminUseCaseRequest): Promise<User> {
    const current = await this.usersRepository.findById(userId)
    if (!current) throw new UserNotFoundError()

    const data: Partial<User> = {}

    if (name !== undefined) data.name = name.trim()

    if (email !== undefined) {
      const normalized = email.trim().toLowerCase()
      if (normalized !== current.email) {
        const taken = await this.usersRepository.findByEmail(normalized)
        if (taken && taken.id !== userId) throw new EmailAlreadyExistsError()
      }
      data.email = normalized
    }

    if (cpf !== undefined) {
      if (cpf === null || cpf === '') {
        data.cpf = null
      } else {
        if (!validateCpf(cpf)) throw new InvalidCpfError()
        const normalized = normalizeCpf(cpf)
        if (normalized !== current.cpf) {
          const taken = await this.usersRepository.findByCpf(normalized)
          if (taken && taken.id !== userId) throw new CpfAlreadyExistsError()
        }
        data.cpf = normalized
      }
    }

    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive
    if (emailVerified !== undefined) data.emailVerified = emailVerified
    if (isImported !== undefined) data.isImported = isImported

    if (Object.keys(data).length === 0) return current

    return this.usersRepository.update(userId, data)
  }
}
