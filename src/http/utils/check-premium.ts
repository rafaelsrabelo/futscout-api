import { prisma } from '@/lib/prisma.js'

/**
 * Verifica se um usuário tem assinatura premium ativa
 * @param userId - ID do usuário
 * @returns true se o usuário tem subscription ativa com plano PREMIUM
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      currentPeriodEnd: {
        gte: new Date(), // Ainda não expirou
      },
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Verifica se tem subscription ativa e se o plano é PREMIUM
  return subscription?.plan?.name === 'PREMIUM'
}

