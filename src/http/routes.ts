import type { FastifyInstance } from 'fastify'
import { register } from './controllers/register.js'
import { authenticate } from './controllers/authenticate.js'

export async function appRoutes(app: FastifyInstance) {
  app.post('/auth/users', register)
  app.post('/auth/sessions', authenticate)
}
