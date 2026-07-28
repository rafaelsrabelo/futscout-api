import { randomUUID } from 'node:crypto'

import type {
  ScoutMessage,
  ScoutThread,
} from '../../../../generated/prisma/client.js'
import type {
  CreateScoutMessageData,
  CreateScoutThreadData,
  ScoutChatRepository,
  ScoutMessageToolCall,
  UpdateScoutThreadData,
} from '../scout-chat-repository.js'

export class InMemoryScoutChatRepository implements ScoutChatRepository {
  public threads: ScoutThread[] = []
  public messages: ScoutMessage[] = []

  async createThread(data: CreateScoutThreadData): Promise<ScoutThread> {
    const now = new Date()
    const thread: ScoutThread = {
      id: randomUUID(),
      userId: data.userId,
      title: data.title ?? null,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    }
    this.threads.push(thread)
    return thread
  }

  async findThreadById(id: string): Promise<ScoutThread | null> {
    return this.threads.find((t) => t.id === id) ?? null
  }

  async findThreadsByUserId(userId: string): Promise<ScoutThread[]> {
    return this.threads
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async updateThread(
    id: string,
    data: UpdateScoutThreadData,
  ): Promise<ScoutThread> {
    const thread = this.threads.find((t) => t.id === id)

    if (!thread) {
      throw new Error('Scout thread not found')
    }

    if (data.title !== undefined) thread.title = data.title
    if (data.status !== undefined) thread.status = data.status
    thread.updatedAt = new Date()

    return thread
  }

  async createMessage(data: CreateScoutMessageData): Promise<ScoutMessage> {
    const message: ScoutMessage = {
      id: randomUUID(),
      threadId: data.threadId,
      role: data.role,
      content: data.content,
      toolCall: data.toolCall
        ? JSON.parse(JSON.stringify(data.toolCall))
        : null,
      cards: data.cards ? JSON.parse(JSON.stringify(data.cards)) : null,
      promptTokens: data.promptTokens ?? null,
      completionTokens: data.completionTokens ?? null,
      totalTokens: data.totalTokens ?? null,
      createdAt: new Date(),
    }
    this.messages.push(message)

    const thread = this.threads.find((t) => t.id === data.threadId)
    if (thread) thread.updatedAt = message.createdAt

    return message
  }

  async findMessagesByThreadId(threadId: string): Promise<ScoutMessage[]> {
    return this.sortedByThread(threadId)
  }

  async findRecentMessages(
    threadId: string,
    limit: number,
  ): Promise<ScoutMessage[]> {
    const relevant = this.sortedByThread(threadId).filter(
      (m) => m.role === 'USER' || m.role === 'ASSISTANT',
    )

    return relevant.slice(-limit)
  }

  async findRecentAssistantToolCalls(
    threadId: string,
    limit: number,
  ): Promise<ScoutMessageToolCall[]> {
    return this.sortedByThread(threadId)
      .filter((m) => m.role === 'ASSISTANT' && m.toolCall !== null)
      .reverse()
      .slice(0, limit)
      .map((m) => m.toolCall as ScoutMessageToolCall)
  }

  /**
   * Ordena por `createdAt` com o índice do array como desempate: em teste as
   * mensagens de um mesmo turno caem no mesmo milissegundo e a ordem de inserção
   * é a única que distingue pergunta de resposta.
   */
  private sortedByThread(threadId: string): ScoutMessage[] {
    return this.messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => message.threadId === threadId)
      .sort(
        (a, b) =>
          a.message.createdAt.getTime() - b.message.createdAt.getTime() ||
          a.index - b.index,
      )
      .map(({ message }) => message)
  }
}
