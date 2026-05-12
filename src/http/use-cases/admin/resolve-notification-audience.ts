import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { NotificationAudiencePayload } from '../../repositories/notification-logs-repository.js'
import type { UsersRepository } from '../../repositories/users-repository.js'

export interface ResolvedAudience {
  userIds: string[]
}

/**
 * Resolve uma `audience` em uma lista de userIds.
 *
 * - `ALL`           → todos os usuários (qualquer role).
 * - `USER_IDS`      → os ids passados, validados como existentes.
 * - `ATHLETE_FILTER`→ delega para AthleteProfileRepository.findUserIdsByAdminFilter
 *                     (reusa os mesmos filtros de list-athletes).
 *
 * Retorna ids únicos, sem ordem garantida.
 */
export async function resolveNotificationAudience(
  audience: NotificationAudiencePayload,
  deps: {
    usersRepository: UsersRepository
    athleteProfileRepository: AthleteProfileRepository
  },
): Promise<ResolvedAudience> {
  switch (audience.type) {
    case 'ALL': {
      const all = await deps.usersRepository.findManyForAdmin(
        {},
        { page: 1, pageSize: 100_000 },
      )
      return { userIds: all.items.map((u) => u.id) }
    }
    case 'USER_IDS': {
      // Valida existência — descarta ids inválidos silenciosamente.
      const found = await Promise.all(
        audience.userIds.map((id) => deps.usersRepository.findById(id)),
      )
      const valid = found
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => u.id)
      return { userIds: Array.from(new Set(valid)) }
    }
    case 'ATHLETE_FILTER': {
      const ids = await deps.athleteProfileRepository.findUserIdsByAdminFilter(
        audience.filters,
      )
      return { userIds: Array.from(new Set(ids)) }
    }
  }
}
