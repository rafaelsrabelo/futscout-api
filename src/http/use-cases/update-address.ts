import type { Address } from '../../../generated/prisma/client.js'
import type { AddressRepository } from '../repositories/address-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface UpdateAddressRequest {
  userId: string
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  city?: string
  state?: string
  country?: string
}

interface UpdateAddressResponse {
  address: Address
}

export class UpdateAddressUseCase {
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
  }: UpdateAddressRequest): Promise<UpdateAddressResponse> {
    // Verificar se o usuário tem perfil de atleta
    const athleteProfile =
      await this.athleteProfileRepository.findByUserId(userId)

    if (!athleteProfile) {
      throw new Error('Athlete profile not found')
    }

    // Verificar se existe endereço
    const existingAddress = await this.addressRepository.findByAthleteId(
      athleteProfile.id,
    )

    if (!existingAddress) {
      throw new Error('Address not found for this athlete')
    }

    const updateData: {
      zipCode?: string
      street?: string
      number?: string
      complement?: string
      district?: string
      city?: string
      state?: string
      country?: string
    } = {}

    if (zipCode !== undefined) updateData.zipCode = zipCode
    if (street !== undefined) updateData.street = street
    if (number !== undefined) updateData.number = number
    if (complement !== undefined) updateData.complement = complement
    if (district !== undefined) updateData.district = district
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (country !== undefined) updateData.country = country

    const address = await this.addressRepository.update(
      athleteProfile.id,
      updateData,
    )

    return {
      address,
    }
  }
}
