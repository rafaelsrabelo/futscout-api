import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ExpoPushMessage,
  ExpoPushSender,
  ExpoPushTicket,
} from '../../../lib/expo-push.js'
import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryNotificationLogsRepository } from '../../repositories/in-memory/in-memory-notification-logs-repository.js'
import { InMemoryPushTokensRepository } from '../../repositories/in-memory/in-memory-push-tokens-repository.js'
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import { SendNotificationAdminUseCase } from './send-notification.js'

const VALID_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaa]'
const VALID_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbb]'
const VALID_C = 'ExponentPushToken[cccccccccccccccccc]'

function makeOkTicket(id = 'tk'): ExpoPushTicket {
  return { status: 'ok', id } as ExpoPushTicket
}

function makeUnregisteredTicket(): ExpoPushTicket {
  return {
    status: 'error',
    message: 'not registered',
    details: { error: 'DeviceNotRegistered' },
  } as ExpoPushTicket
}

let usersRepository: InMemoryUsersRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let pushTokensRepository: InMemoryPushTokensRepository
let notificationLogsRepository: InMemoryNotificationLogsRepository
let fakeSender: ExpoPushSender
let adminId: string

beforeEach(async () => {
  usersRepository = new InMemoryUsersRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  pushTokensRepository = new InMemoryPushTokensRepository()
  notificationLogsRepository = new InMemoryNotificationLogsRepository()

  // Admin + 2 atletas com token + 1 atleta sem token.
  const admin = await usersRepository.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'x',
    role: 'ADMIN',
  })
  adminId = admin.id

  const a1 = await usersRepository.create({
    name: 'A1',
    email: 'a1@test.com',
    password: 'x',
    role: 'ATHLETE',
  })
  const a2 = await usersRepository.create({
    name: 'A2',
    email: 'a2@test.com',
    password: 'x',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'A3-no-token',
    email: 'a3@test.com',
    password: 'x',
    role: 'ATHLETE',
  })

  athleteProfileRepository.users = usersRepository.items

  await pushTokensRepository.upsert({
    userId: a1.id,
    token: VALID_A,
    platform: 'IOS',
  })
  await pushTokensRepository.upsert({
    userId: a2.id,
    token: VALID_B,
    platform: 'ANDROID',
  })

  // Fake sender: chunkPushNotifications passa direto, sendPushNotificationsAsync
  // é mockado por teste pra retornar o que precisamos.
  fakeSender = {
    isExpoPushToken: () => true,
    chunkPushNotifications: (msgs: ExpoPushMessage[]) => [msgs],
    sendPushNotificationsAsync: vi.fn(async () => [] as ExpoPushTicket[]),
  }
})

describe('Send Notification Admin Use Case', () => {
  it('should send to all users with push tokens and persist a log', async () => {
    ;(
      fakeSender.sendPushNotificationsAsync as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([makeOkTicket('1'), makeOkTicket('2')])

    const sut = new SendNotificationAdminUseCase({
      usersRepository,
      athleteProfileRepository,
      pushTokensRepository,
      notificationLogsRepository,
      expoSender: fakeSender,
    })

    const res = await sut.execute({
      title: 'Olá',
      body: 'Mensagem teste',
      audience: { type: 'ALL' },
      sentByUserId: adminId,
    })

    expect(res.totalRecipients).toBe(4) // admin + 3 atletas
    expect(res.totalWithToken).toBe(2)
    expect(res.successCount).toBe(2)
    expect(res.failureCount).toBe(0)
    expect(res.invalidTokensRemoved).toBe(0)

    expect(notificationLogsRepository.items).toHaveLength(1)
    expect(notificationLogsRepository.items[0].sentByUserId).toBe(adminId)
    expect(notificationLogsRepository.items[0].audienceType).toBe('ALL')
  })

  it('should remove tokens reported as DeviceNotRegistered', async () => {
    ;(
      fakeSender.sendPushNotificationsAsync as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([makeOkTicket('1'), makeUnregisteredTicket()])

    const sut = new SendNotificationAdminUseCase({
      usersRepository,
      athleteProfileRepository,
      pushTokensRepository,
      notificationLogsRepository,
      expoSender: fakeSender,
    })

    const before = pushTokensRepository.items.length
    const res = await sut.execute({
      title: 'Olá',
      body: 'Mensagem',
      audience: { type: 'ALL' },
      sentByUserId: adminId,
    })

    expect(res.successCount).toBe(1)
    expect(res.failureCount).toBe(1)
    expect(res.invalidTokensRemoved).toBe(1)
    expect(pushTokensRepository.items.length).toBe(before - 1)
  })

  it('should filter recipients by USER_IDS and only send to provided ones', async () => {
    const [, a1] = usersRepository.items // admin, a1, a2, a3

    ;(
      fakeSender.sendPushNotificationsAsync as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([makeOkTicket('1')])

    const sut = new SendNotificationAdminUseCase({
      usersRepository,
      athleteProfileRepository,
      pushTokensRepository,
      notificationLogsRepository,
      expoSender: fakeSender,
    })

    const res = await sut.execute({
      title: 'Olá',
      body: 'Mensagem',
      audience: { type: 'USER_IDS', userIds: [a1.id] },
      sentByUserId: adminId,
    })

    expect(res.totalRecipients).toBe(1)
    expect(res.totalWithToken).toBe(1)
    expect(res.successCount).toBe(1)
    const callArg = (
      fakeSender.sendPushNotificationsAsync as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as ExpoPushMessage[]
    expect(callArg).toHaveLength(1)
    expect(callArg[0].to).toBe(VALID_A)
  })

  it('should record zero counters when nobody has a token', async () => {
    // Limpa tokens.
    pushTokensRepository.items = []

    const sut = new SendNotificationAdminUseCase({
      usersRepository,
      athleteProfileRepository,
      pushTokensRepository,
      notificationLogsRepository,
      expoSender: fakeSender,
    })

    const res = await sut.execute({
      title: 'Olá',
      body: 'Mensagem',
      audience: { type: 'ALL' },
      sentByUserId: adminId,
    })

    expect(res.totalWithToken).toBe(0)
    expect(res.successCount).toBe(0)
    expect(res.failureCount).toBe(0)
    expect(fakeSender.sendPushNotificationsAsync).not.toHaveBeenCalled()
    expect(notificationLogsRepository.items).toHaveLength(1)
  })

  // Garante que `VALID_C` (token não atribuído) não polui — sanidade.
  it('should not crash if a userId has no token at send time', async () => {
    // Verifica explicitamente que VALID_C é um token válido (formato), mas
    // não está registrado no repo — o use case só busca por userIds.
    expect(VALID_C).toMatch(/^ExponentPushToken\[/)

    const sut = new SendNotificationAdminUseCase({
      usersRepository,
      athleteProfileRepository,
      pushTokensRepository,
      notificationLogsRepository,
      expoSender: fakeSender,
    })

    const res = await sut.execute({
      title: 'Olá',
      body: 'Mensagem',
      audience: { type: 'USER_IDS', userIds: ['ghost-id'] },
      sentByUserId: adminId,
    })

    // userId não existe → totalRecipients=0 (validação por findById descarta)
    expect(res.totalRecipients).toBe(0)
    expect(res.totalWithToken).toBe(0)
  })
})
