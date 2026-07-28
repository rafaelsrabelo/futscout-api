import { randomUUID } from 'node:crypto'

import type { SavedSearch } from '../../../../generated/prisma/client.js'
import type {
  CreateSavedSearchData,
  SavedSearchRepository,
  UpdateSavedSearchData,
} from '../saved-search-repository.js'

export class InMemorySavedSearchRepository implements SavedSearchRepository {
  public items: SavedSearch[] = []

  async create(data: CreateSavedSearchData): Promise<SavedSearch> {
    const now = new Date()
    const savedSearch: SavedSearch = {
      id: randomUUID(),
      userId: data.userId,
      title: data.title,
      description: data.description ?? null,
      filters: JSON.parse(JSON.stringify(data.filters)),
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }

    this.items.push(savedSearch)
    return savedSearch
  }

  async findById(id: string): Promise<SavedSearch | null> {
    return this.items.find((item) => item.id === id) ?? null
  }

  async findByUserId(userId: string): Promise<SavedSearch[]> {
    return this.items
      .filter((item) => item.userId === userId && item.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async update(id: string, data: UpdateSavedSearchData): Promise<SavedSearch> {
    const savedSearch = this.items.find((item) => item.id === id)

    if (!savedSearch) {
      throw new Error('Saved search not found')
    }

    if (data.title !== undefined) savedSearch.title = data.title
    if (data.description !== undefined) {
      savedSearch.description = data.description
    }
    if (data.filters !== undefined) {
      savedSearch.filters = JSON.parse(JSON.stringify(data.filters))
    }
    if (data.isActive !== undefined) savedSearch.isActive = data.isActive
    savedSearch.updatedAt = new Date()

    return savedSearch
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== id)
  }
}
