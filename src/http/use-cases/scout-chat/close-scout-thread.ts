import type { ScoutChatRepository } from '../../repositories/scout-chat-repository.js'
import { ScoutThreadNotFoundError } from '../errors/scout-thread-not-found-error.js'

interface CloseScoutThreadRequest {
  threadId: string
  userId: string
}

/**
 * Arquiva a conversa em vez de apagar: as mensagens guardam os critérios que
 * geraram buscas salvas, então o histórico continua tendo valor.
 */
export class CloseScoutThreadUseCase {
  constructor(private scoutChatRepository: ScoutChatRepository) {}

  async execute({ threadId, userId }: CloseScoutThreadRequest): Promise<void> {
    const thread = await this.scoutChatRepository.findThreadById(threadId)

    if (!thread || thread.userId !== userId) {
      throw new ScoutThreadNotFoundError()
    }

    await this.scoutChatRepository.updateThread(threadId, { status: 'CLOSED' })
  }
}
