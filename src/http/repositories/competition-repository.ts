import type { Competition, Prisma } from '../../../generated/prisma/client.js'

export interface CompetitionRepository {
  create(data: Prisma.CompetitionCreateInput): Promise<Competition>
  findById(id: string): Promise<Competition | null>
  findByAthleteId(athleteId: string): Promise<Competition[]>
  update(id: string, data: Prisma.CompetitionUpdateInput): Promise<Competition>
  delete(id: string): Promise<void>
}

