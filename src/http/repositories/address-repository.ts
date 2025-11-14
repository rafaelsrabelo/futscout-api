import type { Address } from '../../../generated/prisma/client.js'

export interface CreateAddressData {
  athleteId: string
  zipCode: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  country: string
}

export interface UpdateAddressData {
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  city?: string
  state?: string
  country?: string
}

export interface AddressRepository {
  create(data: CreateAddressData): Promise<Address>
  findByAthleteId(athleteId: string): Promise<Address | null>
  update(athleteId: string, data: UpdateAddressData): Promise<Address>
  delete(athleteId: string): Promise<void>
}
