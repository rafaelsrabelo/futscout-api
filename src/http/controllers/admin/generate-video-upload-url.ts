import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { CloudflareR2Service } from '../../../lib/cloudflare-r2.js'

const querySchema = z.object({
  filename: z.string().min(1).max(255),
  expiresIn: z.coerce.number().min(60).max(3600).optional().default(3600),
})

export async function generateVideoUploadUrlAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { filename, expiresIn } = querySchema.parse(request.query)

  const r2Service = new CloudflareR2Service()
  const { uploadUrl, publicUrl, key } =
    await r2Service.generatePresignedUploadUrl(filename, expiresIn)

  return reply.status(200).send({
    uploadUrl,
    publicUrl,
    key,
    expiresIn,
    instructions: {
      method: 'PUT',
      headers: {
        'Content-Type': r2Service.getVideoContentType(filename),
      },
    },
  })
}
