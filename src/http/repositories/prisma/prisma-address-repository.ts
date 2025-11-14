import { prisma } from '../../../lib/prisma.js'
import type {
  AddressRepository,
  CreateAddressData,
  UpdateAddressData,
} from '../address-repository.js'

export class PrismaAddressRepository implements AddressRepository {
  async create(data: CreateAddressData) {
    const address = await prisma.address.create({
      data,
    })

    return address
  }

  async findByAthleteId(athleteId: string) {
    const address = await prisma.address.findUnique({
      where: { athleteId },
    })

    return address
  }

  async update(athleteId: string, data: UpdateAddressData) {
    const address = await prisma.address.update({
      where: { athleteId },
      data,
    })

    return address
  }

  async delete(athleteId: string) {
    await prisma.address.delete({
      where: { athleteId },
    })
  }
}
