import type { AthleteClassificationLog } from 'generated/prisma/client.js'

import type {
  AthleteClassificationLogRepository,
  AthleteClassificationLogWithAdmin,
  CreateAthleteClassificationLogData,
  ListAthleteClassificationLogsResponse,
} from '../athlete-classification-log-repository.js'

interface AdminProfile {
  id: string
  name: string
  email: string
}

export class InMemoryAthleteClassificationLogRepository
  implements AthleteClassificationLogRepository
{
  public items: AthleteClassificationLog[] = []
  public admins: Map<string, AdminProfile> = new Map()

  registerAdmin(profile: AdminProfile) {
    this.admins.set(profile.id, profile)
  }

  async create(
    data: CreateAthleteClassificationLogData,
  ): Promise<AthleteClassificationLog> {
    const log: AthleteClassificationLog = {
      id: `class-log-${this.items.length + 1}`,
      athleteId: data.athleteId,
      classification: data.classification,
      comment: data.comment,
      classifiedById: data.classifiedById,
      createdAt: new Date(),
    }
    this.items.push(log)
    return log
  }

  async listByAthleteId(
    athleteId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ListAthleteClassificationLogsResponse> {
    const all = this.items
      .filter((log) => log.athleteId === athleteId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const { page, pageSize } = pagination
    const start = (page - 1) * pageSize
    const slice = all.slice(start, start + pageSize)

    const items: AthleteClassificationLogWithAdmin[] = slice.map((log) => {
      const admin = this.admins.get(log.classifiedById) ?? {
        id: log.classifiedById,
        name: 'Admin',
        email: 'admin@x.com',
      }
      return { ...log, classifiedBy: admin }
    })

    return { items, total: all.length }
  }
}
