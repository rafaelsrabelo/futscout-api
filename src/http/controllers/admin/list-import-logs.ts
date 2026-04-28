import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma.js'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function listImportLogsAdmin(request: FastifyRequest, reply: FastifyReply) {
  const { page, pageSize } = querySchema.parse(request.query)

  const [logs, total] = await Promise.all([
    prisma.importLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        total: true,
        created: true,
        updated: true,
        errorCount: true,
        createdAt: true,
      },
    }),
    prisma.importLog.count(),
  ])

  return reply.status(200).send({ logs, total, page, pageSize })
}
