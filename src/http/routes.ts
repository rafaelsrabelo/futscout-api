import type { FastifyInstance } from 'fastify'
import { register } from './controllers/register.js'

export async function appRoutes(app: FastifyInstance) {
  app.post('/auth/users', register)
}
