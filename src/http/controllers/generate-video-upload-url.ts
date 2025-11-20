import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'

const generateUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  expiresIn: z.coerce.number().min(60).max(3600).optional().default(3600), // 1 hour default
})

export async function generateVideoUploadUrl(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { filename, expiresIn } = generateUploadUrlSchema.parse(request.query)

    const r2Service = new CloudflareR2Service()
    const { uploadUrl, publicUrl, key } =
      await r2Service.generatePresignedUploadUrl(filename, expiresIn)

    return reply.status(200).send({
      uploadUrl,
      publicUrl,
      key,
      // Instructions for frontend
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4', // Adjust based on file type
        },
        // Frontend should upload directly to uploadUrl
        // After upload, call backend to confirm and save URL
      },
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)
    return reply.status(500).send({
      message: 'Erro ao gerar URL de upload.',
    })
  }
}

