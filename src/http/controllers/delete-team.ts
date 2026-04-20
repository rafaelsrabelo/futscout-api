import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'

export async function deleteTeam(request: FastifyRequest, reply: FastifyReply) {
  const deleteTeamParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = deleteTeamParamsSchema.parse(request.params)
  const userId = request.user.sub

  try {

    const prismaTeamRepository = new PrismaTeamRepository()

    // Verificar se o time existe e pertence ao usuário
    const team = await prismaTeamRepository.findById(id)

    if (!team) {
      return reply.status(404).send({
        message: 'Team not found',
      })
    }

    if (team.userId !== userId) {
      return reply.status(403).send({
        message: 'You can only delete your own teams',
      })
    }

    // Verificar se o time tem partidas associadas
    // Como o relacionamento Match -> Team não tem cascade, precisamos verificar
    // se há partidas antes de permitir a deleção

    // Nota: Vamos implementar uma verificação simples aqui
    // Em um sistema real, você pode querer permitir a deleção e
    // transferir as partidas para um "time removido" ou algo similar

    try {
      // Tentar deletar o time
      await prismaTeamRepository.delete(id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Database error when deleting team:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)

      // Check for foreign key constraint violations
      // PostgreSQL error code 23001 or 23503 indicates foreign key constraint violation
      const isConstraintError =
        error.code === 'P2003' || // Prisma foreign key constraint error
        error.message?.includes('Foreign key constraint') ||
        error.message?.includes(
          'violates RESTRICT setting of foreign key constraint',
        ) ||
        error.message?.includes('matches_myTeamId_fkey') ||
        error.message?.includes('matches_opponentTeamId_fkey')

      if (isConstraintError) {
        return reply.status(409).send({
          message:
            'Cannot delete team with associated matches. Please delete or update the matches first.',
        })
      }

      // For other database errors, return 500
      console.error('Error deleting team:', error)
      return reply.status(500).send({
        message: 'Internal server error while deleting team.',
      })
    }

    return reply.status(204).send()
  } catch (error) {
    console.error('Error deleting team:', error)
    return reply.status(500).send({
      message: 'Internal server error',
    })
  }
}
