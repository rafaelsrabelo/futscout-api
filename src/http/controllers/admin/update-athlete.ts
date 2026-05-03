import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAddressRepository } from '../../repositories/prisma/prisma-address-repository.js'
import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/errors/athlete-not-found-error.js'
import { CpfAlreadyInUseError } from '../../use-cases/admin/errors/cpf-already-in-use-error.js'
import { EmailAlreadyInUseError } from '../../use-cases/admin/errors/email-already-in-use-error.js'
import { NicknameAlreadyInUseError } from '../../use-cases/admin/errors/nickname-already-in-use-error.js'
import { UpdateAthleteAdminUseCase } from '../../use-cases/admin/update-athlete.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const positionEnum = z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])

const bodySchema = z.object({
  // Conta
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  cpf: z.string().min(11).max(14).nullable().optional(),
  isActive: z.boolean().optional(),
  // Perfil
  nickname: z.string().min(1).max(50).optional(),
  profilePhoto: z.string().url().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
  primaryPosition: positionEnum.optional(),
  secondaryPosition: positionEnum.nullable().optional(),
  currentClub: z.string().nullable().optional(),
  biography: z.string().optional(),
  hasManager: z.boolean().optional(),
  managerName: z.string().nullable().optional(),
  managerCompany: z.string().nullable().optional(),
  managerContact: z.string().nullable().optional(),
  hasNutritionist: z.boolean().optional(),
  hasPsychologist: z.boolean().optional(),
  hasPersonalTrainer: z.boolean().optional(),
  instagramUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  // Endereço (upsert)
  address: z
    .object({
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().nullable().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
})

export async function updateAthleteAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new UpdateAthleteAdminUseCase(
    new PrismaAthleteProfileRepository(),
    new PrismaAddressRepository(),
    new PrismaUsersRepository(),
  )

  try {
    const result = await useCase.execute({
      athleteProfileId: id,
      ...body,
    })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    if (error instanceof NicknameAlreadyInUseError) {
      return reply.status(409).send({ message: error.message })
    }
    if (error instanceof EmailAlreadyInUseError) {
      return reply.status(409).send({ message: error.message })
    }
    if (error instanceof CpfAlreadyInUseError) {
      return reply.status(409).send({ message: error.message })
    }

    throw error
  }
}
