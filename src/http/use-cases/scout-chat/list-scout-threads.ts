import type { ScoutChatRepository } from '../../repositories/scout-chat-repository.js'

interface ListScoutThreadsRequest {
  userId: string
}

interface ScoutThreadListItem {
  id: string
  title: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

interface ListScoutThreadsResponse {
  threads: ScoutThreadListItem[]
}

export class ListScoutThreadsUseCase {
  constructor(private scoutChatRepository: ScoutChatRepository) {}

  async execute({
    userId,
  }: ListScoutThreadsRequest): Promise<ListScoutThreadsResponse> {
    const threads = await this.scoutChatRepository.findThreadsByUserId(userId)

    return {
      threads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        status: thread.status,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      })),
    }
  }
}
