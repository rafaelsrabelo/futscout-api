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
    },
    update: {
      videosUsed: {
        increment: 1,
      },
    },
  })
}
