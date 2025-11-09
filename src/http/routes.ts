import type { FastifyInstance } from 'fastify'
import { register } from './controllers/register.js'
import { authenticate } from './controllers/authenticate.js'
import { refreshToken } from './controllers/refresh-token.js'
import { logout, logoutAll } from './controllers/logout.js'
import { getProfile } from './controllers/get-profile.js'
import { createAthleteProfile } from './controllers/create-athlete-profile.js'
import { editAthleteProfile } from './controllers/edit-athlete-profile.js'
import { getMyAthleteProfile } from './controllers/get-my-athlete-profile.js'
import { listAthletes } from './controllers/list-athletes.js'
import { getAthlete } from './controllers/get-athlete.js'
import { verifyEmail } from './controllers/verify-email.js'
import { toggleFavorite } from './controllers/toggle-favorite.js'
import { listFavorites } from './controllers/list-favorites.js'
import { createMatch } from './controllers/create-match.js'
import { listMyMatches } from './controllers/list-my-matches.js'
import { getMatch } from './controllers/get-match.js'
import { updateMatch } from './controllers/update-match.js'
import { addPlay } from './controllers/add-play.js'
import { uploadVideoToPlay } from './controllers/upload-video-to-play.js'
import { generateScout } from './controllers/generate-scout.js'
import { generateScoutByPosition } from './controllers/generate-scout-by-position.js'
import { generateAIScout } from './controllers/generate-ai-scout.js'
import { getScout } from './controllers/get-scout.js'
import { getGeneralStats } from './controllers/get-general-stats.js'
import { verifyJwt } from './middlewares/verify-jwt.js'

export async function appRoutes(app: FastifyInstance) {
  // Public auth routes
  app.post('/auth/users', register)
  app.post('/auth/verify-email', verifyEmail)
  app.post('/auth/sessions', authenticate)
  app.post('/auth/refresh', refreshToken)

  // Protected routes
  app.get('/auth/me', { onRequest: [verifyJwt] }, getProfile)
  app.delete('/auth/sessions', { onRequest: [verifyJwt] }, logout)
  app.delete('/auth/sessions/all', { onRequest: [verifyJwt] }, logoutAll)

  // Protected athlete routes
  app.post(
    '/athletes/profile',
    { onRequest: [verifyJwt] },
    createAthleteProfile,
  )
  app.get('/athletes/profile', { onRequest: [verifyJwt] }, getMyAthleteProfile)
  app.put('/athletes/profile', { onRequest: [verifyJwt] }, editAthleteProfile)
  app.get('/athletes', { onRequest: [verifyJwt] }, listAthletes)
  app.get('/athletes/:id', { onRequest: [verifyJwt] }, getAthlete)

  // Favorite routes
  app.post('/athletes/:id/favorite', { onRequest: [verifyJwt] }, toggleFavorite)
  app.get('/athletes/favorites', { onRequest: [verifyJwt] }, listFavorites)

  // Match routes
  app.post('/matches', { onRequest: [verifyJwt] }, createMatch)
  app.get('/matches', { onRequest: [verifyJwt] }, listMyMatches)
  app.get('/matches/:id', { onRequest: [verifyJwt] }, getMatch)
  app.put('/matches/:id', { onRequest: [verifyJwt] }, updateMatch)
  app.post('/matches/:id/plays', { onRequest: [verifyJwt] }, addPlay)
  app.post(
    '/plays/:playId/video',
    { onRequest: [verifyJwt] },
    uploadVideoToPlay,
  )

  // Scout routes
  app.post('/matches/:id/scout', { onRequest: [verifyJwt] }, generateScout)
  app.post(
    '/matches/:matchId/scout/position',
    { onRequest: [verifyJwt] },
    generateScoutByPosition,
  )
  app.post('/matches/:id/scout/ai', { onRequest: [verifyJwt] }, generateAIScout)
  app.get('/matches/:id/scout', { onRequest: [verifyJwt] }, getScout)

  // General stats route
  app.get('/stats/general', { onRequest: [verifyJwt] }, getGeneralStats)
}
