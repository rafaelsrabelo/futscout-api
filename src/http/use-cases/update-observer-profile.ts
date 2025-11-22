import { validateCpf } from '../../utils/validateCpf.js'
import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'
import { CpfAlreadyExistsError } from './errors/cpf-already-exists-error.js'
import { InvalidCpfError } from './errors/invalid-cpf-error.js'
import { ObserverProfileNotFoundError } from './errors/observer-profile-not-found-error.js'

interface UpdateObserverProfileRequest {
  userId: string
  cpf?: string
  name?: string
  currentClub?: string
  phone?: string
  profilePhoto?: string
}

interface UpdateObserverProfileResponse {
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

export class UpdateObserverProfileUseCase {
  constructor(private observerProfileRepository: ObserverProfileRepository) {}

  async execute({
    userId,
    cpf,
    name,
    currentClub,
    phone,
    profilePhoto,
  }: UpdateObserverProfileRequest): Promise<UpdateObserverProfileResponse> {
    const existingProfile =
      await this.observerProfileRepository.findByUserId(userId)

    if (!existingProfile) {
      throw new ObserverProfileNotFoundError()
    }

    let normalizedCpf = cpf
    if (cpf) {
      // Validar CPF
      if (!validateCpf(cpf)) {
        throw new InvalidCpfError()
      }

      // Normalizar CPF (remover pontos e traços)
      normalizedCpf = cpf.replace(/[.-]/g, '')

      // Verificar se CPF já existe (apenas se for diferente do atual)
      if (normalizedCpf !== existingProfile.cpf) {
        const observerWithSameCpf =
          await this.observerProfileRepository.findByCpf(normalizedCpf)

        if (observerWithSameCpf) {
          throw new CpfAlreadyExistsError()
        }
      }
    }

    // Construir objeto de atualização apenas com campos definidos
    const updateData = {
      ...(normalizedCpf && { cpf: normalizedCpf }),
      ...(name && { name }),
      ...(currentClub && { currentClub }),
      ...(phone && { phone }),
      ...(profilePhoto && { profilePhoto }),
    }

    const observerProfile = await this.observerProfileRepository.update(
      existingProfile.id,
      updateData,
    )

    return {
      observerProfile,
    }
  }
}
