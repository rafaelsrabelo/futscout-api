import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js'
import { PrismaTokenBlacklistRepository } from '../repositories/prisma/prisma-token-blacklist-repository.js'
import { DeleteAccountUseCase, UserNotFoundError } from '../use-cases/delete-account.js'

export async function deleteAccount(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.sub

  try {
    // Adicionar o access token atual à blacklist antes de deletar a conta
    const tokenBlacklistRepository = new PrismaTokenBlacklistRepository()
    const authHeader = request.headers.authorization
    if (authHeader) {
      const accessToken = authHeader.replace('Bearer ', '')
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
      await tokenBlacklistRepository.addToBlacklist(
        accessToken,
        userId,
        expiresAt,
      )
    }

    // Deletar todos os refresh tokens do usuário
    const refreshTokenRepository = new PrismaRefreshTokenRepository()
    await refreshTokenRepository.deleteAllByUserId(userId)

    // Deletar a conta do usuário
    const usersRepository = new PrismaUsersRepository()
    const deleteAccountUseCase = new DeleteAccountUseCase(usersRepository)

    await deleteAccountUseCase.execute({
      userId,
    })

    return reply.status(200).send({
      message: 'Account deleted successfully',
    })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    console.error('Error deleting account:', error)
    return reply.status(500).send({
      message: 'Internal server error',
    })
  }
}

