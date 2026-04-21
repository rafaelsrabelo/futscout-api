import type { Play, Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type {
  AdminAthletePlayFilters,
  AdminAthletePlayListItem,
  AdminAthletePlayPagination,
  CreatePlayWithClassificationsInput,
  PlayRepository,
  PlayWithClassifications,
} from '../play-repository.js'

export class PrismaPlayRepository implements PlayRepository {
  async create(data: Prisma.PlayCreateInput): Promise<Play> {
    return prisma.play.create({
      data,
    })
  }

  async createWithClassifications(
    input: CreatePlayWithClassificationsInput,
  ): Promise<PlayWithClassifications> {
    return prisma.$transaction(async (tx) => {
      const createdPlay = await tx.play.create({
        data: {
          match: { connect: { id: input.matchId } },
          athlete: { connect: { id: input.athleteId } },
          playType: input.playType,
          videoUrl: input.videoUrl ?? null,
          thumbnailUrl: input.thumbnailUrl ?? null,
          photoUrl: input.photoUrl ?? null,
          rating: input.rating ?? null,
          observations: input.observations ?? null,
        },
      })

      if (input.classifications && input.classifications.length > 0) {
        await tx.playClassifications.createMany({
          data: input.classifications.map((classification) => ({
            playId: createdPlay.id,
            classification,
          })),
        })
      }

      const play = await tx.play.findUnique({
        where: { id: createdPlay.id },
        include: { classifications: true },
      })

      if (!play) {
        throw new Error('Failed to create play')
      }

      return play
    })
  }

  async findById(id: string): Promise<Play | null> {
    return prisma.play.findUnique({
      where: { id },
      include: {
        classifications: true,
        match: {
          select: {
            id: true,
            athleteId: true,
          },
        },
        athlete: {
          select: {
            id: true,
          },
        },
      },
    })
  }

  async findByMatch(matchId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: { matchId },
      include: {
        classifications: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findManyByMatchId(matchId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: { matchId },
      include: {
        classifications: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(id: string, data: Prisma.PlayUpdateInput): Promise<Play> {
    return prisma.play.update({
      where: { id },
      data,
    })
  }

  async updateVideoUrl(
    id: string,
    videoUrl: string,
    thumbnailUrl?: string | null,
  ): Promise<Play> {
    return prisma.play.update({
      where: { id },
      data: {
        videoUrl,
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      },
    })
  }

  async clearVideo(id: string): Promise<Play> {
    return prisma.play.update({
      where: { id },
      data: {
        videoUrl: null,
        thumbnailUrl: null,
      },
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.play.delete({
      where: { id },
    })
  }

  async findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminAthletePlayFilters,
    pagination: AdminAthletePlayPagination,
  ): Promise<{ items: AdminAthletePlayListItem[]; total: number }> {
    const where: Prisma.PlayWhereInput = {
      OR: [
        { athleteId: athleteProfileId },
        { match: { athleteId: athleteProfileId } },
      ],
    }

    if (filters.hasVideo === true) {
      where.videoUrl = { not: null }
    } else if (filters.hasVideo === false) {
      where.videoUrl = null
    }

    if (filters.playType) {
      where.playType = filters.playType
    }

    if (filters.matchId) {
      where.matchId = filters.matchId
    }

    if (filters.from || filters.to) {
      where.createdAt = {}
      if (filters.from) where.createdAt.gte = filters.from
      if (filters.to) where.createdAt.lte = filters.to
    }

    const [rows, total] = await Promise.all([
      prisma.play.findMany({
        where,
        include: {
          classifications: true,
          match: {
            select: { id: true, date: true, adversaryTeam: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.play.count({ where }),
    ])

    const items: AdminAthletePlayListItem[] = rows.map((row) => {
      const { match, ...rest } = row
      return {
        ...rest,
        match: match ?? null,
      }
    })

    return { items, total }
  }

  async findVideosByAthleteId(athleteId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: {
        videoUrl: {
          not: null,
        },
        OR: [
          {
            match: {
              athleteId,
            },
          },
          {
            athleteId,
            matchId: null, // Lances sem partida
          },
        ],
      },
      include: {
        classifications: true,
        match: {
          select: {
            id: true,
            adversaryTeam: true,
            date: true,
            category: true,
          },
        },
        athlete: {
          select: {
            id: true,
            nickname: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limitar a 20 vídeos mais recentes
    })
  }
}
