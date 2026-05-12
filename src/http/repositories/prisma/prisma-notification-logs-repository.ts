import { prisma } from '@/lib/prisma.js'

import type {
  CreateNotificationLogInput,
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationAudiencePayload,
  NotificationLogEntity,
  NotificationLogsRepository,
} from '../notification-logs-repository.js'

// Mapeia uma row crua do Prisma (audiencePayload como JsonValue) para o tipo
// estrutural usado pelos use cases.
function mapRow(row: {
  id: string
  title: string
  body: string
  data: unknown
  audienceType: string
  audiencePayload: unknown
  sentByUserId: string
  totalRecipients: number
  totalWithToken: number
  successCount: number
  failureCount: number
  invalidTokensCnt: number
  createdAt: Date
}): NotificationLogEntity {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown> | null) ?? null,
    audienceType: row.audienceType as NotificationLogEntity['audienceType'],
    audiencePayload: row.audiencePayload as NotificationAudiencePayload,
    sentByUserId: row.sentByUserId,
    totalRecipients: row.totalRecipients,
    totalWithToken: row.totalWithToken,
    successCount: row.successCount,
    failureCount: row.failureCount,
    invalidTokensCnt: row.invalidTokensCnt,
    createdAt: row.createdAt,
  }
}

export class PrismaNotificationLogsRepository
  implements NotificationLogsRepository
{
  async create(
    data: CreateNotificationLogInput,
  ): Promise<NotificationLogEntity> {
    const row = await prisma.notificationLog.create({
      data: {
        title: data.title,
        body: data.body,
        data: data.data ?? undefined,
        audienceType: data.audienceType,
        audiencePayload: data.audiencePayload as unknown as object,
        sentByUserId: data.sentByUserId,
        totalRecipients: data.totalRecipients,
        totalWithToken: data.totalWithToken,
        successCount: data.successCount,
        failureCount: data.failureCount,
        invalidTokensCnt: data.invalidTokensCnt,
      },
    })
    return mapRow(row)
  }

  async findById(id: string): Promise<NotificationLogEntity | null> {
    const row = await prisma.notificationLog.findUnique({ where: { id } })
    return row ? mapRow(row) : null
  }

  async list(
    params: ListNotificationsParams,
  ): Promise<ListNotificationsResult> {
    const { page, pageSize } = params

    const [rows, total] = await Promise.all([
      prisma.notificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notificationLog.count(),
    ])

    return { items: rows.map(mapRow), total }
  }
}
