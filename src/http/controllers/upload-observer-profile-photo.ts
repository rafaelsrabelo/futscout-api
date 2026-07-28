import type { FastifyRequest, FastifyReply } from 'fastify'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { prisma } from '../../lib/prisma.js'
import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { verifyJwt } from '../middlewares/verify-jwt.js'

export async function uploadObserverProfilePhoto(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Verificar autenticação
    await verifyJwt(request, reply)

    // Verificar se o usuário tem perfil de observador
    const observerRepository = new PrismaObserverProfileRepository()
    const observerProfile = await observerRepository.findByUserId(
      request.user.sub,
    )

    if (!observerProfile) {
      return reply.status(404).send({
        message:
          'Perfil de observador não encontrado. Crie seu perfil primeiro.',
      })
    }

    // Processar upload do arquivo
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({
        message: 'Nenhum arquivo foi enviado.',
      })
    }

    // Validar tipo de arquivo (apenas imagens)
    const validImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (!validImageTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        message:
          'Tipo de arquivo inválido. Apenas imagens são permitidas (JPEG, PNG, WebP, GIF).',
      })
    }

    // Validar tamanho do arquivo (máximo 10MB para fotos)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const buffer = await data.toBuffer()

    if (buffer.length > maxSize) {
      return reply.status(400).send({
        message: 'Arquivo muito grande. Tamanho máximo permitido: 10MB.',
      })
    }

    // Upload para Cloudflare R2
    const cloudflareService = new CloudflareR2Service()
    const { url } = await cloudflareService.uploadImage(buffer, data.filename)


    // Atualizar o perfil do observador com a nova URL da foto
    const updatedProfile = await observerRepository.update(observerProfile.id, {
      profilePhoto: url,
    })

    // O nome vem de `users.name` — o perfil de observador não guarda mais cópia.
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { name: true },
    })

    return reply.status(200).send({
      message: 'Foto de perfil enviada com sucesso!',
      profilePhoto: url,
      observerProfile: {
        id: updatedProfile.id,
        name: user?.name ?? null,
        profilePhoto: updatedProfile.profilePhoto,
        updatedAt: updatedProfile.updatedAt,
      },
    })
  } catch (error) {
    console.error('❌ Erro no upload da foto de perfil do observador:', error)

    if (error instanceof Error) {
      // Erros específicos do Cloudflare
      if (error.message.includes('Cloudflare')) {
        return reply.status(503).send({
          message:
            'Serviço de upload temporariamente indisponível. Tente novamente.',
        })
      }

      // Erro de configuração
      if (error.message.includes('credentials not configured')) {
        return reply.status(500).send({
          message:
            'Serviço de upload não configurado. Verifique as credenciais do Cloudflare R2.',
        })
      }
    }

    return reply.status(500).send({
      message: 'Erro interno durante o upload da foto.',
    })
  }
}
