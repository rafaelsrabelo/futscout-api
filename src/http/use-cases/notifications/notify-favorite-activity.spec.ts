import { beforeEach, describe, expect, it } from 'vitest'
import type {
  ExpoPushMessage,
  ExpoPushSender,
  ExpoPushTicket,
} from '../../../lib/expo-push.js'
import type { User } from '../../../../generated/prisma/client.js'
import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryFavoriteRepository } from '../../repositories/in-memory/in-memory-favorite-repository.js'
import { InMemoryObserverProfileRepository } from '../../repositories/in-memory/in-memory-observer-profile-repository.js'
import { InMemoryPushTokensRepository } from '../../repositories/in-memory/in-memory-push-tokens-repository.js'
import { InMemoryUserNotificationRepository } from '../../repositories/in-memory/in-memory-user-notification-repository.js'
import { NotifyFavoriteActivityUseCase } from './notify-favorite-activity.js'

/** Sender que aceita tudo e registra o que seria enviado. */
class FakeExpoSender implements ExpoPushSender {
  public sent: ExpoPushMessage[] = []

  chunkPushNotifications(messages: ExpoPushMessage[]) {
    return [messages]
  }

  async sendPushNotificationsAsync(chunk: ExpoPushMessage[]) {
    this.sent.push(...chunk)
    return chunk.map(() => ({ status: 'ok' }) as ExpoPushTicket)
  }

  isExpoPushToken() {
    return true
  }
}

let favoriteRepository: InMemoryFavoriteRepository
let userNotificationRepository: InMemoryUserNotificationRepository
let observerProfileRepository: InMemoryObserverProfileRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let pushTokensRepository: InMemoryPushTokensRepository
let expoSender: FakeExpoSender
let sut: NotifyFavoriteActivityUseCase

const OBSERVER_ID = 'observer-1'

/** Cria o atleta e devolve o AthleteProfile.id. */
async function seedAthlete(
  name = 'João Vitor',
  nickname: string | null = null,
) {
  const userId = `athlete-user-${athleteProfileRepository.items.length + 1}`

  athleteProfileRepository.users.push({
    id: userId,
    name,
    role: 'ATHLETE',
    isActive: true,
  } as User)

  const profile = await athleteProfileRepository.create({
    userId,
    gender: 'MALE',
    height: 1.8,
    weight: 75,
    dominantFoot: 'RIGHT',
    primaryPosition: 'FORWARD',
    ...(nickname ? { nickname } : {}),
  })

  return profile.id
}

/** Observador com perfil (aceitando avisos por padrão) e um push token. */
async function seedObserver(userId = OBSERVER_ID, withToken = true) {
  await observerProfileRepository.create({ userId, phone: '85999999999' })

  if (withToken) {
    await pushTokensRepository.upsert({
      userId,
      token: `ExponentPushToken[${userId}]`,
      platform: 'IOS',
    })
  }
}

beforeEach(() => {
  favoriteRepository = new InMemoryFavoriteRepository()
  userNotificationRepository = new InMemoryUserNotificationRepository()
  observerProfileRepository = new InMemoryObserverProfileRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  pushTokensRepository = new InMemoryPushTokensRepository()
  expoSender = new FakeExpoSender()

  sut = new NotifyFavoriteActivityUseCase({
    favoriteRepository,
    userNotificationRepository,
    observerProfileRepository,
    athleteProfileRepository,
    pushTokensRepository,
    expoSender,
  })
})

describe('Notify Favorite Activity Use Case', () => {
  it('should notify the observer who favorited the athlete', async () => {
    const athleteId = await seedAthlete('João Vitor')
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    const result = await sut.execute({ athleteId, type: 'FAVORITE_MATCH' })

    expect(result).toMatchObject({ notified: 1, aggregated: 0 })
    expect(userNotificationRepository.items).toHaveLength(1)
    expect(userNotificationRepository.items[0]).toMatchObject({
      userId: OBSERVER_ID,
      type: 'FAVORITE_MATCH',
      title: 'Nova partida',
      body: 'João Vitor cadastrou uma nova partida.',
      actorAthleteId: athleteId,
    })
  })

  it('should send a push with a deep link to the athlete', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })

    expect(expoSender.sent).toHaveLength(1)
    expect(expoSender.sent[0]).toMatchObject({ title: 'Novo lance' })
    expect(userNotificationRepository.items[0]?.data).toEqual({
      screen: 'athlete',
      params: { athleteId },
    })
  })

  it('should point a match notification at the match itself', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    await sut.execute({
      athleteId,
      type: 'FAVORITE_MATCH',
      matchId: 'match-1',
    })

    expect(userNotificationRepository.items[0]?.data).toEqual({
      screen: 'match',
      params: { matchId: 'match-1' },
    })
  })

  it('should fall back to the athlete once matches aggregate', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    await sut.execute({ athleteId, type: 'FAVORITE_MATCH', matchId: 'match-1' })
    await sut.execute({ athleteId, type: 'FAVORITE_MATCH', matchId: 'match-2' })

    // Duas partidas numa notificação só: linkar uma delas seria mentira.
    expect(userNotificationRepository.items[0]?.data).toEqual({
      screen: 'athlete',
      params: { athleteId },
    })
  })

  it('should not double count when a video is attached to an announced play', async () => {
    const athleteId = await seedAthlete('João Vitor')
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    // Lance criado sem vídeo avisa; o vídeo chegando depois é o MESMO conteúdo.
    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })
    const attach = await sut.execute({
      athleteId,
      type: 'FAVORITE_PLAY',
      aggregateOnly: true,
    })

    expect(attach).toMatchObject({ notified: 0, aggregated: 0, pushed: 0 })
    expect(userNotificationRepository.items[0]).toMatchObject({
      eventCount: 1,
      body: 'João Vitor publicou um novo lance.',
    })
  })

  it('should still notify when the video is the first news in the window', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    // Nada foi anunciado antes — o vídeo é a novidade.
    const result = await sut.execute({
      athleteId,
      type: 'FAVORITE_PLAY',
      aggregateOnly: true,
    })

    expect(result.notified).toEqual(1)
    expect(expoSender.sent).toHaveLength(1)
  })

  it('should prefer the nickname when the athlete has one', async () => {
    const athleteId = await seedAthlete('João Vitor Andrade', 'Joãozinho')
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })

    expect(userNotificationRepository.items[0]?.body).toEqual(
      'Joãozinho publicou um novo lance.',
    )
  })

  it('should aggregate a burst instead of sending one push per event', async () => {
    const athleteId = await seedAthlete('João Vitor')
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    // Atleta sobe três lances seguidos da mesma partida.
    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })
    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })
    const third = await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })

    expect(third).toMatchObject({ notified: 0, aggregated: 1, pushed: 0 })
    // Uma notificação só, com a contagem — e um único push.
    expect(userNotificationRepository.items).toHaveLength(1)
    expect(userNotificationRepository.items[0]).toMatchObject({
      eventCount: 3,
      body: 'João Vitor publicou 3 novos lances.',
    })
    expect(expoSender.sent).toHaveLength(1)
  })

  it('should keep match and play notifications separate', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })
    await sut.execute({ athleteId, type: 'FAVORITE_MATCH' })

    expect(userNotificationRepository.items).toHaveLength(2)
  })

  it('should start a new notification once the previous one was read', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })
    await userNotificationRepository.markAllAsRead(OBSERVER_ID)

    const result = await sut.execute({ athleteId, type: 'FAVORITE_PLAY' })

    // Já lida não agrega: o observador merece saber que houve algo novo.
    expect(result.notified).toEqual(1)
    expect(userNotificationRepository.items).toHaveLength(2)
  })

  it('should respect the observer who turned notifications off', async () => {
    const athleteId = await seedAthlete()
    await seedObserver()
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    const profile = await observerProfileRepository.findByUserId(OBSERVER_ID)
    await observerProfileRepository.update(profile!.id, {
      notifyOnFavoriteActivity: false,
    })

    const result = await sut.execute({ athleteId, type: 'FAVORITE_MATCH' })

    expect(result).toMatchObject({ notified: 0, pushed: 0 })
    expect(userNotificationRepository.items).toHaveLength(0)
    expect(expoSender.sent).toHaveLength(0)
  })

  it('should notify every observer who favorited the athlete', async () => {
    const athleteId = await seedAthlete()
    await seedObserver('observer-1')
    await seedObserver('observer-2')
    await favoriteRepository.toggleFavorite('observer-1', athleteId)
    await favoriteRepository.toggleFavorite('observer-2', athleteId)

    const result = await sut.execute({ athleteId, type: 'FAVORITE_MATCH' })

    expect(result.notified).toEqual(2)
    expect(expoSender.sent).toHaveLength(2)
  })

  it('should do nothing when nobody favorited the athlete', async () => {
    const athleteId = await seedAthlete()

    const result = await sut.execute({ athleteId, type: 'FAVORITE_MATCH' })

    expect(result).toEqual({ notified: 0, aggregated: 0, pushed: 0 })
    expect(expoSender.sent).toHaveLength(0)
  })

  it('should still record the notification when the observer has no push token', async () => {
    const athleteId = await seedAthlete()
    await seedObserver(OBSERVER_ID, false)
    await favoriteRepository.toggleFavorite(OBSERVER_ID, athleteId)

    const result = await sut.execute({ athleteId, type: 'FAVORITE_MATCH' })

    // A caixa de entrada é o que dá durabilidade — push é o extra.
    expect(result).toMatchObject({ notified: 1, pushed: 0 })
    expect(userNotificationRepository.items).toHaveLength(1)
  })
})
