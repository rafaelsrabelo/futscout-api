import { prisma } from '../../../lib/prisma.js'

/**
 * Nota de sessão do turno: quem é o observador e o que ele já tem salvo.
 *
 * Fica atrás de uma interface para o `SendScoutMessageUseCase` não precisar de
 * mais três repositórios — e para o teste do turno continuar rodando sem banco.
 * Em produção o provider é o Prisma; nos specs, ausente ou dublê.
 */
export interface ScoutSessionContextProvider {
  build(userId: string): Promise<string>
}

/** Títulos suficientes para o modelo notar repetição sem inchar o prompt. */
const MAX_SAVED_SEARCH_TITLES = 8

export class PrismaScoutSessionContextProvider
  implements ScoutSessionContextProvider
{
  async build(userId: string): Promise<string> {
    // Uma ida ao banco só: nome do observador + títulos das buscas salvas.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        observerProfile: { select: { currentClub: true } },
        savedSearches: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: MAX_SAVED_SEARCH_TITLES,
          select: { title: true },
        },
      },
    })

    if (!user) return ''

    const lines: string[] = []
    const firstName = user.name.trim().split(/\s+/)[0] || user.name

    lines.push(
      `Você está falando com ${firstName}, observador` +
        (user.observerProfile?.currentClub
          ? ` do ${user.observerProfile.currentClub}.`
          : '.') +
        ' Chame pelo primeiro nome, com naturalidade.',
    )

    if (user.savedSearches.length > 0) {
      // Só os títulos: os filtros de cada uma seriam ruído, e o que importa é
      // ele perceber que a busca já existe em vez de oferecer como novidade.
      lines.push(
        'Buscas que ele já salvou: ' +
          user.savedSearches.map((search) => `"${search.title}"`).join(', ') +
          '. Se o pedido for igual a uma delas, diga que já está salva em vez ' +
          'de oferecer para salvar de novo.',
      )
    }

    return lines.join('\n')
  }
}
