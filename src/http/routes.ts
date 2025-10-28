import type { FastifyInstance } from 'fastify'
import { register } from './controllers/register.js'
import { authenticate } from './controllers/authenticate.js'
import { getProfile } from './controllers/get-profile.js'
import { createAthleteProfile } from './controllers/create-athlete-profile.js'
import { listAthletes } from './controllers/list-athletes.js'
import { getAthlete } from './controllers/get-athlete.js'
import { verifyJwt } from './middlewares/verify-jwt.js'

export async function appRoutes(app: FastifyInstance) {
  // Public auth routes
  app.post('/auth/users', register)
  app.post('/auth/sessions', authenticate)

  // Protected routes
  app.get('/auth/me', { onRequest: [verifyJwt] }, getProfile)

  // Protected athlete routes
  app.post(
    '/athletes/profile',
    { onRequest: [verifyJwt] },
    createAthleteProfile,
  )
  app.get('/athletes', { onRequest: [verifyJwt] }, listAthletes)
  app.get('/athletes/:id', { onRequest: [verifyJwt] }, getAthlete)
}
