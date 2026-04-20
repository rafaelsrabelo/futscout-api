import type { FastifyReply, FastifyRequest } from 'fastify'

export async function verifyAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(403).send({
      message: 'Acesso restrito a administradores.',
    })
  }
}
