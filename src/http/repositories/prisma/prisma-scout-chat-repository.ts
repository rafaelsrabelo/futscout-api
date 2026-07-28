import { Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type {
  CreateScoutMessageData,
  CreateScoutThreadData,
  ScoutChatRepository,
  ScoutMessageToolCall,
  UpdateScoutThreadData,
} from '../scout-chat-repository.js'

export class PrismaScoutChatRepository implements ScoutChatRepository {
  async createThread(data: CreateScoutThreadData) {
    return prisma.scoutThread.create({
      data: {
        userId: data.userId,
        title: data.title ?? null,
      },
    })
  }

  async findThreadById(id: string) {
    return prisma.scoutThread.findUnique({ where: { id } })
  }

  async findThreadsByUserId(userId: string) {
    return prisma.scoutThread.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async updateThread(id: string, data: UpdateScoutThreadData) {
    return prisma.scoutThread.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })
  }

  async createMessage(data: CreateScoutMessageData) {
    const message = await prisma.scoutMessage.create({
      data: {
        threadId: data.threadId,
        role: data.role,
        content: data.content,
        // Json do Prisma não aceita `undefined` aninhado — serializa e volta.
        ...(data.toolCall
          ? { toolCall: JSON.parse(JSON.stringify(data.toolCall)) }
          : {}),
        ...(data.cards
          ? { cards: JSON.parse(JSON.stringify(data.cards)) }
          : {}),
        promptTokens: data.promptTokens ?? null,
        completionTokens: data.completionTokens ?? null,
        totalTokens: data.totalTokens ?? null,
      },
    })

    // Reabre a janela de `updatedAt` da thread para a listagem ordenar certo.
    await prisma.scoutThread.update({
      where: { id: data.threadId },
      data: { updatedAt: new Date() },
    })

    return message
  }

  async findMessagesByThreadId(threadId: string) {
    return prisma.scoutMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findRecentMessages(threadId: string, limit: number) {
    const messages = await prisma.scoutMessage.findMany({
      where: { threadId, role: { in: ['USER', 'ASSISTANT'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return messages.reverse()
  }

  async findRecentAssistantToolCalls(threadId: string, limit: number) {
    const messages = await prisma.scoutMessage.findMany({
      // `DbNull` e não `null`: em coluna Json o Prisma exige o sentinela para
      // distinguir "SQL NULL" de "o valor JSON null".
      where: { threadId, role: 'ASSISTANT', toolCall: { not: Prisma.DbNull } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { toolCall: true },
    })

    return messages.map((m) => m.toolCall as ScoutMessageToolCall)
  }
}
