import type { FastifyReply, FastifyRequest } from 'fastify'
import { syncCurrentClubWithPrincipalTeam } from '../utils/sync-current-club.js'

export async function syncCurrentClub(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.sub

  try {
    await syncCurrentClubWithPrincipalTeam(userId)
    return reply.status(200).send({
      message: 'Current club synchronized with principal team successfully',
    })
  } catch (error) {
    return reply.status(500).send({
      message: 'Failed to synchronize current club',
    })
  }
}
