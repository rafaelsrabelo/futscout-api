import { validateCpf } from '../../utils/validateCpf.js'
import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'
import { CpfAlreadyExistsError } from './errors/cpf-already-exists-error.js'
import { prisma } from '../../lib/prisma.js'

interface CreateObserverProfileRequest {
  userId: string
  cpf: string
  name: string
  currentClub?: string | undefined
  phone: string
  profilePhoto?: string | undefined
}

interface CreateObserverProfileResponse {
  observerProfile: {
    id: string
    userId: string
    cpf: string
    name: string
    currentClub: string | null
    phone: string
    profilePhoto: string | null
    createdAt: Date
    updatedAt: Date
  }
}

export class CreateObserverProfileUseCase {
  constructor(private observerProfileRepository: ObserverProfileRepository) {}

  async execute({
    userId,
    cpf,
    name,
    currentClub,
    phone,
    profilePhoto,
  }: CreateObserverProfileRequest): Promise<CreateObserverProfileResponse> {
    // Validar CPF
    if (!validateCpf(cpf)) {
      throw new Error('Invalid CPF format')
    }

    // Normalizar CPF (remover pontos e traços)
    const normalizedCpf = cpf.replace(/[.-]/g, '')

    // Verificar se CPF já existe
    const observerWithSameCpf =
      await this.observerProfileRepository.findByCpf(normalizedCpf)

    if (observerWithSameCpf) {
      throw new CpfAlreadyExistsError()
    }

    // Criar o perfil do observador
    const observerProfile = await this.observerProfileRepository.create({
      userId,
      cpf: normalizedCpf,
      name,
      phone,
      ...(currentClub && { currentClub }),
      ...(profilePhoto && { profilePhoto }),
    })

    // Atualizar o campo isProfile para true no usuário
    await prisma.user.update({
      where: { id: userId },
      data: { isProfile: true },
    })

    return {
      observerProfile,
    }
  }
}
