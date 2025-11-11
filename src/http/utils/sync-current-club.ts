import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'

/**
 * Sincroniza o currentClub do perfil do atleta com o time principal
 */
export async function syncCurrentClubWithPrincipalTeam(
  userId: string,
): Promise<void> {
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const teamRepository = new PrismaTeamRepository()

  try {
    // Buscar o time principal do usuário
    const teams = await teamRepository.findByUserId(userId)
    const principalTeam = teams.find((team) => team.isPrincipal)

    // Atualizar o currentClub no perfil do atleta
    if (principalTeam) {
      await athleteProfileRepository.update(userId, {
        currentClub: principalTeam.name,
      })
    } else {
      // Se não há time principal, limpar o currentClub
      await athleteProfileRepository.update(userId, {
        currentClub: null,
      })
    }
  } catch (error) {
    console.warn('Failed to sync currentClub with principal team:', error)
    throw error
  }
}
