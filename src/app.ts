import { fastify } from 'fastify'
import { PrismaClient } from '../generated/prisma/client.js'

export const app = fastify()

const prisma = new PrismaClient()

// app.get('/users', async () => {
//   const users = await prisma.users.findMany()
//   return users
// })
prisma.user
  .create({
    data: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '123456',
    },
  })
  .then((user) => {
    console.log(user)
  })
