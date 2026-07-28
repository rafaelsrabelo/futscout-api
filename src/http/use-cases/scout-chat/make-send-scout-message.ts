import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaSavedSearchRepository } from '../../repositories/prisma/prisma-saved-search-repository.js'
import { PrismaScoutChatRepository } from '../../repositories/prisma/prisma-scout-chat-repository.js'
import { OpenAiScoutLlmService } from './llm/openai-scout-llm-service.js'
import { SendScoutMessageUseCase } from './send-scout-message.js'
import { GetAthleteDetailsTool } from './tools/get-athlete-details-tool.js'
import { SaveSearchTool } from './tools/save-search-tool.js'
import { SearchAthletesTool } from './tools/search-athletes-tool.js'
import { ScoutToolsRegistry } from './tools/tools-registry.js'

/**
 * Monta a árvore do chat (repos → tools → registry → LLM → use case). Fica fora
 * do controller porque são 7 peças; o resto do projeto instancia repo direto no
 * controller, mas aqui isso viraria ruído repetido.
 */
export function makeSendScoutMessageUseCase(): SendScoutMessageUseCase {
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const savedSearchRepository = new PrismaSavedSearchRepository()
  const scoutChatRepository = new PrismaScoutChatRepository()

  const registry = new ScoutToolsRegistry([
    new SearchAthletesTool(athleteProfileRepository),
    new GetAthleteDetailsTool(athleteProfileRepository),
    new SaveSearchTool(savedSearchRepository),
  ])

  return new SendScoutMessageUseCase(
    scoutChatRepository,
    new OpenAiScoutLlmService(registry),
  )
}
