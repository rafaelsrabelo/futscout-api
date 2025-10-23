import { fastify } from 'fastify'
import { PrismaClient } from '../generated/prisma/client.js'

export const app = fastify()

const prisma = new PrismaClient()

app.get('/users', async () => {
  const users = await prisma.user.findMany()
  return users
})
