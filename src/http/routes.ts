import type { FastifyInstance } from 'fastify'
import { addPlay } from './controllers/add-play.js'
import { addTeamHistory } from './controllers/add-team-history.js'
import { authenticate } from './controllers/authenticate.js'
import { createAthleteProfile } from './controllers/create-athlete-profile.js'
import { createCompetition } from './controllers/create-competition.js'
import { createMatch } from './controllers/create-match.js'
import { createObserverProfile } from './controllers/create-observer-profile.js'
import { createSavedSearch } from './controllers/create-saved-search.js'
import { createStandalonePlay } from './controllers/create-standalone-play.js'
import { createTeam } from './controllers/create-team.js'
import { deleteCompetition } from './controllers/delete-competition.js'
import { deleteMatch } from './controllers/delete-match.js'
import { deletePlay } from './controllers/delete-play.js'
import { deleteSavedSearch } from './controllers/delete-saved-search.js'
import { deleteTeam } from './controllers/delete-team.js'
import { editAthleteProfile } from './controllers/edit-athlete-profile.js'
import { editTeamHistory } from './controllers/edit-team-history.js'
import { editTeam } from './controllers/edit-team.js'
import { executeSavedSearch } from './controllers/execute-saved-search.js'
import { generateAIScout } from './controllers/generate-ai-scout.js'
import { generateScoutByPosition } from './controllers/generate-scout-by-position.js'
import { generateScout } from './controllers/generate-scout.js'
import { getAthlete } from './controllers/get-athlete.js'
import { getCompetition } from './controllers/get-competition.js'
import { getGeneralStats } from './controllers/get-general-stats.js'
import { getMatch } from './controllers/get-match.js'
import { getMyAthleteProfile } from './controllers/get-my-athlete-profile.js'
import { getObserverProfile } from './controllers/get-observer-profile.js'
import { getProfile } from './controllers/get-profile.js'
import { getScout } from './controllers/get-scout.js'
import { getVideoFeed } from './controllers/get-video-feed.js'
import { listAthletes } from './controllers/list-athletes.js'
import { listFavorites } from './controllers/list-favorites.js'
import { listMyCompetitions } from './controllers/list-my-competitions.js'
import { listMyMatches } from './controllers/list-my-matches.js'
import { listMyTeams } from './controllers/list-my-teams.js'
import { listSavedSearches } from './controllers/list-saved-searches.js'
import { listTeamHistory } from './controllers/list-team-history.js'
import { logout, logoutAll } from './controllers/logout.js'
import { refreshToken } from './controllers/refresh-token.js'
import { register } from './controllers/register.js'
import { syncCurrentClub } from './controllers/sync-current-club.js'
import { toggleFavorite } from './controllers/toggle-favorite.js'
import { updateCompetition } from './controllers/update-competition.js'
import { updateMatch } from './controllers/update-match.js'
import { updateObserverProfile } from './controllers/update-observer-profile.js'
import { updatePlay } from './controllers/update-play.js'
import { updateSavedSearch } from './controllers/update-saved-search.js'
import { updateUserRole } from './controllers/update-user-role.js'
import { uploadObserverProfilePhoto } from './controllers/upload-observer-profile-photo.js'
import { uploadProfilePhoto } from './controllers/upload-profile-photo.js'
import { uploadVideoToPlay } from './controllers/upload-video-to-play.js'
import { verifyEmail } from './controllers/verify-email.js'

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

  // User routes
  app.patch('/users/me/role', { onRequest: [verifyJwt] }, updateUserRole)

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

  // Competition routes
  app.post('/competitions', { onRequest: [verifyJwt] }, createCompetition)
  app.get('/competitions', { onRequest: [verifyJwt] }, listMyCompetitions)
  app.get('/competitions/:id', { onRequest: [verifyJwt] }, getCompetition)
  app.put('/competitions/:id', { onRequest: [verifyJwt] }, updateCompetition)
  app.delete('/competitions/:id', { onRequest: [verifyJwt] }, deleteCompetition)

  // Match routes
  app.post('/matches', { onRequest: [verifyJwt] }, createMatch)
  app.get('/matches', { onRequest: [verifyJwt] }, listMyMatches)
  app.get('/matches/:id', { onRequest: [verifyJwt] }, getMatch)
  app.put('/matches/:id', { onRequest: [verifyJwt] }, updateMatch)
  app.delete('/matches/:id', { onRequest: [verifyJwt] }, deleteMatch)
  app.post('/matches/:id/plays', { onRequest: [verifyJwt] }, addPlay)
  app.post('/plays', { onRequest: [verifyJwt] }, createStandalonePlay)
  app.put('/plays/:playId', { onRequest: [verifyJwt] }, updatePlay)
  app.delete('/plays/:id', { onRequest: [verifyJwt] }, deletePlay)
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

  // Saved searches routes (Observer only)
  app.post('/saved-searches', { onRequest: [verifyJwt] }, createSavedSearch)
  app.get('/saved-searches', { onRequest: [verifyJwt] }, listSavedSearches)
  app.put('/saved-searches/:id', { onRequest: [verifyJwt] }, updateSavedSearch)
  app.delete(
    '/saved-searches/:id',
    { onRequest: [verifyJwt] },
    deleteSavedSearch,
  )
  app.get(
    '/saved-searches/:id/execute',
    { onRequest: [verifyJwt] },
    executeSavedSearch,
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
