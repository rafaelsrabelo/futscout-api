import type { FastifyInstance } from 'fastify'
import { register } from './controllers/register.js'
import { authenticate } from './controllers/authenticate.js'
import { refreshToken } from './controllers/refresh-token.js'
import { logout, logoutAll } from './controllers/logout.js'
import { getProfile } from './controllers/get-profile.js'
import { createAthleteProfile } from './controllers/create-athlete-profile.js'
import { editAthleteProfile } from './controllers/edit-athlete-profile.js'
import { getMyAthleteProfile } from './controllers/get-my-athlete-profile.js'
import { uploadProfilePhoto } from './controllers/upload-profile-photo.js'
import { listAthletes } from './controllers/list-athletes.js'
import { getAthlete } from './controllers/get-athlete.js'
import { verifyEmail } from './controllers/verify-email.js'
import { toggleFavorite } from './controllers/toggle-favorite.js'
import { listFavorites } from './controllers/list-favorites.js'
import { createMatch } from './controllers/create-match.js'
import { listMyMatches } from './controllers/list-my-matches.js'
import { getMatch } from './controllers/get-match.js'
import { updateMatch } from './controllers/update-match.js'
import { deleteMatch } from './controllers/delete-match.js'
import { addPlay } from './controllers/add-play.js'
import { uploadVideoToPlay } from './controllers/upload-video-to-play.js'
import { getVideoFeed } from './controllers/get-video-feed.js'
import { generateScout } from './controllers/generate-scout.js'
import { generateScoutByPosition } from './controllers/generate-scout-by-position.js'
import { generateAIScout } from './controllers/generate-ai-scout.js'
import { getScout } from './controllers/get-scout.js'
import { getGeneralStats } from './controllers/get-general-stats.js'
import { createTeam } from './controllers/create-team.js'
import { listMyTeams } from './controllers/list-my-teams.js'
import { editTeam } from './controllers/edit-team.js'
import { deleteTeam } from './controllers/delete-team.js'
import { addTeamHistory } from './controllers/add-team-history.js'
import { listTeamHistory } from './controllers/list-team-history.js'
import { editTeamHistory } from './controllers/edit-team-history.js'
import { createObserverProfile } from './controllers/create-observer-profile.js'
import { getObserverProfile } from './controllers/get-observer-profile.js'
import { updateObserverProfile } from './controllers/update-observer-profile.js'
import { uploadObserverProfilePhoto } from './controllers/upload-observer-profile-photo.js'
import { updatePlay } from './controllers/update-play.js'
import { syncCurrentClub } from './controllers/sync-current-club.js'
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
  app.post(
    '/athletes/profile/photo',
    { onRequest: [verifyJwt] },
    uploadProfilePhoto,
  )
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
  app.delete('/matches/:id', { onRequest: [verifyJwt] }, deleteMatch)
  app.post('/matches/:id/plays', { onRequest: [verifyJwt] }, addPlay)
  app.put('/plays/:playId', { onRequest: [verifyJwt] }, updatePlay)
  app.post(
    '/plays/:playId/video',
    { onRequest: [verifyJwt] },
    uploadVideoToPlay,
  )

  // Video feed route
  app.get('/videos/feed', { onRequest: [verifyJwt] }, getVideoFeed)

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

  // Team routes
  app.post('/teams', { onRequest: [verifyJwt] }, createTeam)
  app.get('/teams/my', { onRequest: [verifyJwt] }, listMyTeams)
  app.put('/teams/:id', { onRequest: [verifyJwt] }, editTeam)
  app.delete('/teams/:id', { onRequest: [verifyJwt] }, deleteTeam)

  // Team history routes
  app.post('/team-history', { onRequest: [verifyJwt] }, addTeamHistory)
  app.get('/team-history/my', { onRequest: [verifyJwt] }, listTeamHistory)
  app.put('/team-history/:id', { onRequest: [verifyJwt] }, editTeamHistory)

  // Observer profile routes
  app.post(
    '/observer/profile',
    { onRequest: [verifyJwt] },
    createObserverProfile,
  )
  app.get('/observer/profile', { onRequest: [verifyJwt] }, getObserverProfile)
  app.put(
    '/observer/profile',
    { onRequest: [verifyJwt] },
    updateObserverProfile,
  )
  app.post(
    '/observer/profile/photo',
    { onRequest: [verifyJwt] },
    uploadObserverProfilePhoto,
  )

  // Utility routes
  app.post('/athletes/sync-club', { onRequest: [verifyJwt] }, syncCurrentClub)

  // Utility routes
  app.post(
    '/athletes/sync-current-club',
    { onRequest: [verifyJwt] },
    syncCurrentClub,
  )
}
