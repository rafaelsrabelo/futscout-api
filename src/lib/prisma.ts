import { env } from '@/env/index.js'
import { PrismaClient } from '../../generated/prisma/client.js'

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'dev' ? ['query'] : [],
})
