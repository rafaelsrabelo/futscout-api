import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { PrismaPushTokensRepository } from '../repositories/prisma/prisma-push-tokens-repository.js'
import { PrismaUserNotificationRepository } from '../repositories/prisma/prisma-user-notification-repository.js'
import type { UserNotificationType } from '../repositories/user-notification-repository.js'
import { NotifyFavoriteActivityUseCase } from '../use-cases/notifications/notify-favorite-activity.js'

/**
 * Dispara o aviso aos observadores que favoritaram o atleta.
 *
 * Deliberadamente NÃO aguardado pelos controllers e blindado contra qualquer
 * erro: notificação não pode atrasar nem derrubar o cadastro da partida ou do
 * lance. Se a Expo estiver fora do ar, o atleta nem percebe.
 */
export function notifyFavoritesInBackground(
  athleteId: string,
  type: UserNotificationType,
  options: { matchId?: string; aggregateOnly?: boolean } = {},
): void {
  const useCase = new NotifyFavoriteActivityUseCase({
    favoriteRepository: new PrismaFavoriteRepository(),
    userNotificationRepository: new PrismaUserNotificationRepository(),
    observerProfileRepository: new PrismaObserverProfileRepository(),
    athleteProfileRepository: new PrismaAthleteProfileRepository(),
    pushTokensRepository: new PrismaPushTokensRepository(),
  })

  useCase
    .execute({ athleteId, type, ...options })
    .then((result) => {
      if (result.notified > 0 || result.aggregated > 0) {
        console.log(
          `🔔 favoritos [${type}] atleta=${athleteId} ` +
            `novas=${result.notified} agregadas=${result.aggregated} push=${result.pushed}`,
        )
      }
    })
    .catch((error) => {
      console.error(
        `❌ falha ao notificar favoritos [${type}] atleta=${athleteId}:`,
        error instanceof Error ? error.message : error,
      )
    })
}
