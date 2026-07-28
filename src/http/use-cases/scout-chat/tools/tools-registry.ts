import type {
  ScoutTool,
  ScoutToolContext,
  ScoutToolResult,
} from './tool-types.js'

/**
 * Resolve o nome da tool que o modelo pediu e executa. Erro de tool nunca
 * derruba o turno: vira payload de erro que o modelo lê e contorna na
 * próxima iteração.
 */
export class ScoutToolsRegistry {
  private tools: Map<string, ScoutTool>

  constructor(tools: ScoutTool[]) {
    this.tools = new Map(tools.map((tool) => [tool.name, tool]))
  }

  /**
   * Tools no formato nativo do Chat Completions. A OpenAI valida a chamada
   * contra estes schemas antes de nos entregar, o que remove o caminho em que
   * o modelo "quase" acertava a forma e o turno saía vazio.
   */
  toOpenAiTools() {
    return [...this.tools.values()].map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  async run(
    name: string,
    args: Record<string, unknown>,
    ctx: ScoutToolContext,
  ): Promise<ScoutToolResult> {
    const tool = this.tools.get(name)

    if (!tool) {
      return {
        data: { error: 'UNKNOWN_TOOL', name },
        summary: `Tool "${name}" não existe.`,
      }
    }

    try {
      return await tool.execute(args, ctx)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        data: { error: 'TOOL_FAILED', message },
        summary: `A tool ${name} falhou: ${message}`,
      }
    }
  }
}
