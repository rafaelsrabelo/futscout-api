import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaTokenBlacklistRepository } from '../repositories/prisma/prisma-token-blacklist-repository.js'

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    // Verificar se o token está na blacklist
    const authHeader = request.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const tokenBlacklistRepository = new PrismaTokenBlacklistRepository()
      const isBlacklisted =
        await tokenBlacklistRepository.isTokenBlacklisted(token)
      if (isBlacklisted) {
        return reply.status(401).send({ message: 'Token has been revoked' })
      }
    }
  } catch (error) {
    return reply.status(401).send({ message: 'Unauthorized' })
  }
}
