import type { Address } from 'generated/prisma/client.js'
import type {
  AddressRepository,
  CreateAddressData,
  UpdateAddressData,
} from '../address-repository.js'

export class InMemoryAddressRepository implements AddressRepository {
  public items: Address[] = []

  async create(data: CreateAddressData): Promise<Address> {
    const address: Address = {
      id: `address-${this.items.length + 1}`,
      athleteId: data.athleteId,
      zipCode: data.zipCode,
      street: data.street,
      number: data.number,
      complement: data.complement ?? null,
      district: data.district,
      city: data.city,
      state: data.state,
      country: data.country,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.items.push(address)
    return address
  }

  async findByAthleteId(athleteId: string): Promise<Address | null> {
    return this.items.find((a) => a.athleteId === athleteId) ?? null
  }

  async update(athleteId: string, data: UpdateAddressData): Promise<Address> {
    const idx = this.items.findIndex((a) => a.athleteId === athleteId)
    if (idx === -1) throw new Error('Address not found')
    const updated = {
      ...this.items[idx]!,
      ...data,
      updatedAt: new Date(),
    } as Address
    this.items[idx] = updated
    return updated
  }

  async delete(athleteId: string): Promise<void> {
    this.items = this.items.filter((a) => a.athleteId !== athleteId)
  }
}
