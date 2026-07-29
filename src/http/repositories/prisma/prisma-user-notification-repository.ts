import { prisma } from '../../../lib/prisma.js'
import type {
  CreateUserNotificationData,
  ListUserNotificationsFilters,
  UserNotificationData,
  UserNotificationRepository,
} from '../user-notification-repository.js'

export class PrismaUserNotificationRepository
  implements UserNotificationRepository
{
  async create(data: CreateUserNotificationData) {
    return prisma.userNotification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        ...(data.data ? { data: JSON.parse(JSON.stringify(data.data)) } : {}),
        actorAthleteId: data.actorAthleteId ?? null,
        groupKey: data.groupKey,
      },
    })
  }

  async findOpenByGroupKey(groupKey: string, since: Date) {
    return prisma.userNotification.findFirst({
      where: {
        groupKey,
        readAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async incrementEvent(
    id: string,
    data: { title: string; body: string; data?: UserNotificationData | null },
  ) {
    return prisma.userNotification.update({
      where: { id },
      data: {
        eventCount: { increment: 1 },
        title: data.title,
        body: data.body,
        ...(data.data ? { data: JSON.parse(JSON.stringify(data.data)) } : {}),
      },
    })
  }

  async findManyByUser(filters: ListUserNotificationsFilters) {
    const { userId, page = 1, limit = 20, onlyUnread = false } = filters

    const where = {
      userId,
      ...(onlyUnread ? { readAt: null } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userNotification.count({ where }),
    ])

    return { items, total }
  }

  async countUnread(userId: string) {
    return prisma.userNotification.count({
      where: { userId, readAt: null },
    })
  }

  async markAsRead(id: string, userId: string) {
    // `updateMany` com o userId no where evita ler antes de escrever e já
    // garante que ninguém marque notificação alheia.
    const result = await prisma.userNotification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    })

    if (result.count === 0) {
      // Ou não existe, ou é de outro usuário, ou já estava lida.
      return prisma.userNotification.findFirst({ where: { id, userId } })
    }

    return prisma.userNotification.findUnique({ where: { id } })
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    return result.count
  }
}
