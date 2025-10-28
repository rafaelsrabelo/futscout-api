import type { FastifyInstance } from 'fastify'
import { register } from './controllers/register.js'
import { authenticate } from './controllers/authenticate.js'
import { getProfile } from './controllers/get-profile.js'
import { createAthleteProfile } from './controllers/create-athlete-profile.js'
import { listAthletes } from './controllers/list-athletes.js'
import { getAthlete } from './controllers/get-athlete.js'

export async function appRoutes(app: FastifyInstance) {
  // Auth routes
  app.post('/auth/users', register)
  app.post('/auth/sessions', authenticate)
  app.get('/auth/me', getProfile)

  // Athlete routes
  app.post('/athletes/profile', createAthleteProfile)
  app.get('/athletes', listAthletes)
  app.get('/athletes/:id', getAthlete)
}
