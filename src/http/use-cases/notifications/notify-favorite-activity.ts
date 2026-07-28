import { sendExpoPushNotifications } from '../../../lib/expo-push.js'
import type { ExpoPushSender } from '../../../lib/expo-push.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { FavoriteRepository } from '../../repositories/favorite-repository.js'
import type { ObserverProfileRepository } from '../../repositories/observer-profile-repository.js'
import type { PushTokensRepository } from '../../repositories/push-tokens-repository.js'
import type {
  UserNotificationRepository,
  UserNotificationType,
} from '../../repositories/user-notification-repository.js'

/**
 * Janela de agregação. Um atleta que sobe oito lances de uma partida geraria
 * oito pushes por observador — o suficiente para queimar a permissão de
 * notificação do app em uma tarde. Dentro da janela, os eventos seguintes
 * somam na notificação aberta e NÃO disparam push.
 */
const AGGREGATION_WINDOW_MINUTES = 30

interface NotifyFavoriteActivityRequest {
  /** AthleteProfile.id de quem gerou o evento. */
  athleteId: string
  type: UserNotificationType
}

interface NotifyFavoriteActivityDeps {
  favoriteRepository: FavoriteRepository
  userNotificationRepository: UserNotificationRepository
  observerProfileRepository: ObserverProfileRepository
  athleteProfileRepository: AthleteProfileRepository
  pushTokensRepository: PushTokensRepository
  /** Injetável para os testes não tocarem a rede. */
  expoSender?: ExpoPushSender
}

interface NotifyFavoriteActivityResponse {
  notified: number
  aggregated: number
  pushed: number
}

const TITLE: Record<UserNotificationType, string> = {
  FAVORITE_MATCH: 'Nova partida',
  FAVORITE_PLAY: 'Novo lance',
}

function buildBody(
  type: UserNotificationType,
  athleteName: string,
  count: number,
): string {
  if (type === 'FAVORITE_MATCH') {
    return count === 1
      ? `${athleteName} cadastrou uma nova partida.`
      : `${athleteName} cadastrou ${count} novas partidas.`
  }

  return count === 1
    ? `${athleteName} publicou um novo lance.`
    : `${athleteName} publicou ${count} novos lances.`
}

/**
 * Avisa os observadores que favoritaram um atleta quando ele cadastra partida
 * ou publica lance.
 *
 * Nunca lança: é chamado depois da escrita principal e não pode derrubar o
 * cadastro do atleta por causa de uma notificação. Erros viram log.
 */
export class NotifyFavoriteActivityUseCase {
  constructor(private deps: NotifyFavoriteActivityDeps) {}

  async execute({
    athleteId,
    type,
  }: NotifyFavoriteActivityRequest): Promise<NotifyFavoriteActivityResponse> {
    const empty = { notified: 0, aggregated: 0, pushed: 0 }

    const favoritedBy =
      await this.deps.favoriteRepository.findUserIdsByAthlete(athleteId)

    if (favoritedBy.length === 0) return empty

    const recipients =
      await this.deps.observerProfileRepository.filterUserIdsAcceptingFavoriteActivity(
        favoritedBy,
      )

    if (recipients.length === 0) return empty

    const athlete = await this.deps.athleteProfileRepository.findById(athleteId)

    if (!athlete) return empty

    const athleteName = athlete.nickname?.trim() || athlete.user.name

    const since = new Date(Date.now() - AGGREGATION_WINDOW_MINUTES * 60 * 1000)
    // Quem recebe notificação NOVA leva push; quem só somou no grupo, não.
    const usersToPush: string[] = []
    let notified = 0
    let aggregated = 0

    for (const userId of recipients) {
      const groupKey = `${userId}:${type}:${athleteId}`

      const open =
        await this.deps.userNotificationRepository.findOpenByGroupKey(
          groupKey,
          since,
        )

      if (open) {
        await this.deps.userNotificationRepository.incrementEvent(open.id, {
          title: TITLE[type],
          body: buildBody(type, athleteName, open.eventCount + 1),
        })
        aggregated += 1
        continue
      }

      await this.deps.userNotificationRepository.create({
        userId,
        type,
        title: TITLE[type],
        body: buildBody(type, athleteName, 1),
        data: {
          screen: 'athlete',
          params: { athleteId },
        },
        actorAthleteId: athleteId,
        groupKey,
      })
      notified += 1
      usersToPush.push(userId)
    }

    const pushed = await this.push(usersToPush, type, athleteName)

    return { notified, aggregated, pushed }
  }

  private async push(
    userIds: string[],
    type: UserNotificationType,
    athleteName: string,
  ): Promise<number> {
    if (userIds.length === 0) return 0

    const tokens =
      await this.deps.pushTokensRepository.findManyByUserIds(userIds)

    if (tokens.length === 0) return 0

    const result = await sendExpoPushNotifications(
      tokens.map((token) => ({
        to: token.token,
        title: TITLE[type],
        body: buildBody(type, athleteName, 1),
        sound: 'default' as const,
        channelId: 'default',
      })),
      this.deps.expoSender,
    )

    if (result.invalidTokens.length > 0) {
      await this.deps.pushTokensRepository.deleteManyByTokens(
        result.invalidTokens,
      )
    }

    return result.successCount
  }
}
