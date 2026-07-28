import { prisma } from '../../lib/prisma.js'

export async function incrementMatchUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  await prisma.usage.upsert({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
    create: {
      userId,
      month,
      year,
      matchesUsed: 1,
      videosUsed: 0,
      standaloneVideosUsed: 0,
    },
    update: {
      matchesUsed: {
        increment: 1,
      },
    },
  })
}

export async function incrementVideoUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  await prisma.usage.upsert({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
    create: {
      userId,
      month,
      year,
      matchesUsed: 0,
      videosUsed: 1,
      standaloneVideosUsed: 0,
    },
    update: {
      videosUsed: {
        increment: 1,
      },
    },
  })
}

export async function incrementStandaloneVideoUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  await prisma.usage.upsert({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
    create: {
      userId,
      month,
      year,
      matchesUsed: 0,
      videosUsed: 0,
      standaloneVideosUsed: 1,
    },
    update: {
      standaloneVideosUsed: {
        increment: 1,
      },
    },
  })
}

/**
 * Conta uma mensagem enviada ao chat de busca. Chamada pelo controller DEPOIS
 * do turno completar: turno que falhou não consome cota do observador.
 */
export async function incrementAiMessageUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  await prisma.usage.upsert({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
    create: {
      userId,
      month,
      year,
      matchesUsed: 0,
      videosUsed: 0,
      standaloneVideosUsed: 0,
      aiMessagesUsed: 1,
    },
    update: {
      aiMessagesUsed: {
        increment: 1,
      },
    },
  })
}

export async function decrementVideoUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const usage = await prisma.usage.findUnique({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
  })

  if (usage && usage.videosUsed > 0) {
    await prisma.usage.update({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      data: {
        videosUsed: {
          decrement: 1,
        },
      },
    })
  }
}

export async function decrementStandaloneVideoUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const usage = await prisma.usage.findUnique({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
  })

  if (usage && usage.standaloneVideosUsed > 0) {
    await prisma.usage.update({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      data: {
        standaloneVideosUsed: {
          decrement: 1,
        },
      },
    })
  }
}

export async function decrementMatchUsage(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const usage = await prisma.usage.findUnique({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
  })

  if (usage && usage.matchesUsed > 0) {
    await prisma.usage.update({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      data: {
        matchesUsed: {
          decrement: 1,
        },
      },
    })
  }
}
