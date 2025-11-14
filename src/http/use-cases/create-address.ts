import type { Address } from '../../../generated/prisma/client.js'
import type { AddressRepository } from '../repositories/address-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface CreateAddressRequest {
  userId: string
  zipCode: string
  street: string
  number: string
  complement?: string | undefined
  district: string
  city: string
  state: string
  country: string
}

interface CreateAddressResponse {
  address: Address
}

export class CreateAddressUseCase {
  constructor(
    private addressRepository: AddressRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    userId,
    zipCode,
    street,
    number,
    complement,
    district,
    city,
    state,
    country,
  }: CreateAddressRequest): Promise<CreateAddressResponse> {
    // Verificar se o usuário tem perfil de atleta
    const athleteProfile =
      await this.athleteProfileRepository.findByUserId(userId)

    if (!athleteProfile) {
      throw new Error('Athlete profile not found')
    }

    // Verificar se já existe endereço
    const existingAddress = await this.addressRepository.findByAthleteId(
      athleteProfile.id,
    )

    if (existingAddress) {
      throw new Error('Address already exists for this athlete')
    }

    const addressData: {
      athleteId: string
      zipCode: string
      street: string
      number: string
      complement?: string
      district: string
      city: string
      state: string
      country: string
    } = {
      athleteId: athleteProfile.id,
      zipCode,
      street,
      number,
      district,
      city,
      state,
      country,
    }

    if (complement !== undefined) {
      addressData.complement = complement
    }

    const address = await this.addressRepository.create(addressData)

    return {
      address,
    }
  }
}
