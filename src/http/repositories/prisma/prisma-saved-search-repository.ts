import { prisma } from '../../../lib/prisma.js'
import type {
  SavedSearchRepository,
  CreateSavedSearchData,
  UpdateSavedSearchData,
} from '../saved-search-repository.js'

export class PrismaSavedSearchRepository implements SavedSearchRepository {
  async create(data: CreateSavedSearchData) {
    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description ?? null,
        filters: JSON.parse(JSON.stringify(data.filters)),
        isActive: data.isActive ?? true,
      },
    })

    return savedSearch
  }

  async findById(id: string) {
    const savedSearch = await prisma.savedSearch.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return savedSearch
  }

  async findByUserId(userId: string) {
    const savedSearches = await prisma.savedSearch.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return savedSearches
  }

  async update(id: string, data: UpdateSavedSearchData) {
    const savedSearch = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.filters && {
          filters: JSON.parse(JSON.stringify(data.filters)),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return savedSearch
  }

  async delete(id: string) {
    await prisma.savedSearch.delete({
      where: { id },
    })
  }
}
