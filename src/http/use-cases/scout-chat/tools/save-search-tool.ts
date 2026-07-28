import { z } from 'zod'
import type { SavedSearchRepository } from '../../../repositories/saved-search-repository.js'
import type {
  ScoutTool,
  ScoutToolContext,
  ScoutToolResult,
} from './tool-types.js'

/**
 * Só o nome e a descrição vêm do modelo. Os filtros NÃO: chegam por
 * `ctx.standingFilters`, montados pelo backend a partir da busca que rodou de
 * verdade. Se o modelo pudesse informá-los, um esquecimento dele ("perdi o
 * canhoto no caminho") salvaria uma busca diferente da que o observador viu.
 */
const argsSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

/**
 * Persiste os critérios da conversa como SavedSearch, para o observador
 * reexecutar depois por GET /saved-searches/:id/execute. É o que sobrou do
 * formulário: a busca continua salvável, só não é mais preenchida à mão.
 */
export class SaveSearchTool implements ScoutTool {
  readonly name = 'save_search'
  readonly description =
    'Salva a busca ATUAL com um nome, para o observador reutilizar depois. Só ' +
    'chame quando ele pedir explicitamente para salvar, e só depois de já ter ' +
    'buscado — os filtros vêm da busca que rodou, você não precisa repeti-los. ' +
    'Passe apenas title (curto) e, opcionalmente, description.'

  constructor(private savedSearchRepository: SavedSearchRepository) {}

  async execute(
    args: Record<string, unknown>,
    ctx: ScoutToolContext,
  ): Promise<ScoutToolResult> {
    const parsed = argsSchema.parse(args)
    const filters = ctx.standingFilters

    // Sem busca feita não há o que salvar. Devolve o controle ao modelo para ele
    // buscar primeiro, em vez de gravar um filtro vazio que traria a base toda.
    if (!filters || Object.keys(filters).length === 0) {
      return {
        data: { error: 'NO_FILTERS' },
        summary:
          'Nenhuma busca foi feita ainda nesta conversa. Busque antes de salvar.',
      }
    }

    const savedSearch = await this.savedSearchRepository.create({
      userId: ctx.userId,
      title: parsed.title,
      description: parsed.description ?? null,
      filters,
    })

    return {
      data: { savedSearchId: savedSearch.id, title: savedSearch.title },
      summary: `Busca salva como "${savedSearch.title}".`,
      appliedFilters: filters,
      savedSearchId: savedSearch.id,
    }
  }
}
