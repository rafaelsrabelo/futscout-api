import type { FastifyInstance, FastifyRequest } from 'fastify'
import { addPlay } from './controllers/add-play.js'
import { addTeamHistory } from './controllers/add-team-history.js'
import { addPlayToMatchAdmin } from './controllers/admin/add-play-to-match.js'
import { createMatchAdmin } from './controllers/admin/create-match.js'
import { deletePlayAdmin } from './controllers/admin/delete-play.js'
import { dashboardOverviewAdmin } from './controllers/admin/dashboard-overview.js'
import { dashboardInactivityBucketsAdmin } from './controllers/admin/dashboard-inactivity-buckets.js'
import { dashboardUserActivityAdmin } from './controllers/admin/dashboard-user-activity.js'
import { dashboardUserGrowthAdmin } from './controllers/admin/dashboard-user-growth.js'
import { generateVideoUploadUrlAdmin } from './controllers/admin/generate-video-upload-url.js'
import { getAthleteAdmin } from './controllers/admin/get-athlete.js'
import { importAthletesAdmin } from './controllers/admin/import-athletes.js'
import { listImportLogsAdmin } from './controllers/admin/list-import-logs.js'
import { getMatchAdmin } from './controllers/admin/get-match.js'
import { listAthleteAchievementsAdmin } from './controllers/admin/list-athlete-achievements.js'
import { listAthleteMatchesAdmin } from './controllers/admin/list-athlete-matches.js'
import { listAthletePlaysAdmin } from './controllers/admin/list-athlete-plays.js'
import { listAthleteTeamHistoryAdmin } from './controllers/admin/list-athlete-team-history.js'
import { listAthletesAdmin } from './controllers/admin/list-athletes.js'
import { linkMatchAthleteAdmin } from './controllers/admin/link-match-athlete.js'
import { listMatchPlaysAdmin } from './controllers/admin/list-match-plays.js'
import { listMatchesAdmin } from './controllers/admin/list-matches.js'
import { removePlayVideoAdmin } from './controllers/admin/remove-play-video.js'
import { searchAdmin } from './controllers/admin/search.js'
import { updateMatchResultAdmin } from './controllers/admin/update-match-result.js'
import { updatePlayVideoUrlAdmin } from './controllers/admin/update-play-video-url.js'
import { verifyAdminSession } from './controllers/admin/verify-admin-session.js'
import { authenticate } from './controllers/authenticate.js'
import { checkCpf } from './controllers/check-cpf.js'
import { recoverAccessByCpf } from './controllers/recover-access-by-cpf.js'
import { checkPriceIdMatch } from './controllers/billing/check-price-id-match.js'
import { checkout } from './controllers/billing/checkout.js'
import { getStripeConfig } from './controllers/billing/get-stripe-config.js'
import { getSubscription } from './controllers/billing/get-subscription.js'
import { listPlans } from './controllers/billing/list-plans.js'
import { portal } from './controllers/billing/portal.js'
import { webhook } from './controllers/billing/webhook.js'
import { createAchievement } from './controllers/create-achievement.js'
import { createAthleteProfile } from './controllers/create-athlete-profile.js'
import { createCompetition } from './controllers/create-competition.js'
import { createMatch } from './controllers/create-match.js'
import { createObserverProfile } from './controllers/create-observer-profile.js'
import { createPlayWithVideoUrl } from './controllers/create-play-with-video-url.js'
import { createSavedSearch } from './controllers/create-saved-search.js'
import { createStandalonePlay } from './controllers/create-standalone-play.js'
import { createTeam } from './controllers/create-team.js'
import { deleteAccount } from './controllers/delete-account.js'
import { deleteAchievement } from './controllers/delete-achievement.js'
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
import { generateVideoUploadUrl } from './controllers/generate-video-upload-url.js'
import { getAthlete } from './controllers/get-athlete.js'
import { getCompetition } from './controllers/get-competition.js'
import { getGeneralStats } from './controllers/get-general-stats.js'
import { getMatch } from './controllers/get-match.js'
import { getMyAthleteProfile } from './controllers/get-my-athlete-profile.js'
import { getObserverProfile } from './controllers/get-observer-profile.js'
import { getProfile } from './controllers/get-profile.js'
import { getScout } from './controllers/get-scout.js'
import { getVideoFeed } from './controllers/get-video-feed.js'
import { listAchievements } from './controllers/list-achievements.js'
import { listAthletes } from './controllers/list-athletes.js'
import { listFavorites } from './controllers/list-favorites.js'
import { listMyCompetitions } from './controllers/list-my-competitions.js'
import { listMyMatches } from './controllers/list-my-matches.js'
import { listMyTeams } from './controllers/list-my-teams.js'
import { listSavedSearches } from './controllers/list-saved-searches.js'
import { listTeamHistory } from './controllers/list-team-history.js'
import { logout, logoutAll } from './controllers/logout.js'
import { publicGetAthlete } from './controllers/public-get-athlete.js'
import { publicListAthletes } from './controllers/public-list-athletes.js'
import { refreshToken } from './controllers/refresh-token.js'
import { regenerateThumbnail } from './controllers/regenerate-thumbnail.js'
import { register } from './controllers/register.js'
import { socialLogin } from './controllers/social-login.js'
import { syncCurrentClub } from './controllers/sync-current-club.js'
import { toggleFavorite } from './controllers/toggle-favorite.js'
import { updateAchievement } from './controllers/update-achievement.js'
import { updateCompetition } from './controllers/update-competition.js'
import { updateMatch } from './controllers/update-match.js'
import { updateObserverProfile } from './controllers/update-observer-profile.js'
import { updatePlayVideoUrl } from './controllers/update-play-video-url.js'
import { updatePlay } from './controllers/update-play.js'
import { updateSavedSearch } from './controllers/update-saved-search.js'
import { updateUserRole } from './controllers/update-user-role.js'
import { uploadObserverProfilePhoto } from './controllers/upload-observer-profile-photo.js'
import { uploadProfilePhoto } from './controllers/upload-profile-photo.js'
import { uploadVideoToPlay } from './controllers/upload-video-to-play.js'
import { verifyEmail } from './controllers/verify-email.js'

import { checkUsage } from './middlewares/check-usage.js'
import { verifyAdmin } from './middlewares/verify-admin.js'
import { verifyJwt } from './middlewares/verify-jwt.js'

export async function appRoutes(app: FastifyInstance) {
  // Health check route
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Public auth routes
  app.post('/auth/users', register)
  app.post('/auth/verify-email', verifyEmail)
  app.post('/auth/sessions', authenticate)
  app.post('/auth/social-login', socialLogin)
  app.post('/auth/refresh', refreshToken)
  app.post('/auth/check-cpf', checkCpf)
  app.post('/auth/recover-access', recoverAccessByCpf)

  // Public athlete routes (accessible without JWT for web)
  app.get('/public/athletes', publicListAthletes)
  app.get('/public/athletes/:id', publicGetAthlete)

  // Protected routes
  app.get('/auth/me', { onRequest: [verifyJwt] }, getProfile)
  app.delete('/auth/sessions', { onRequest: [verifyJwt] }, logout)
  app.delete('/auth/sessions/all', { onRequest: [verifyJwt] }, logoutAll)
  app.delete('/auth/account', { onRequest: [verifyJwt] }, deleteAccount)

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

  // Achievement routes (títulos e conquistas)
  app.post('/achievements', { onRequest: [verifyJwt] }, createAchievement)
  app.get('/achievements', { onRequest: [verifyJwt] }, listAchievements)
  app.put('/achievements/:id', { onRequest: [verifyJwt] }, updateAchievement)
  app.delete('/achievements/:id', { onRequest: [verifyJwt] }, deleteAchievement)

  // Competition routes
  app.post('/competitions', { onRequest: [verifyJwt] }, createCompetition)
  app.get('/competitions', { onRequest: [verifyJwt] }, listMyCompetitions)
  app.get('/competitions/:id', { onRequest: [verifyJwt] }, getCompetition)
  app.put('/competitions/:id', { onRequest: [verifyJwt] }, updateCompetition)
  app.delete('/competitions/:id', { onRequest: [verifyJwt] }, deleteCompetition)

  // Match routes
  app.post('/matches', { onRequest: [verifyJwt, checkUsage] }, createMatch)
  app.get('/matches', { onRequest: [verifyJwt] }, listMyMatches)
  app.get('/matches/:id', { onRequest: [verifyJwt] }, getMatch)
  app.put('/matches/:id', { onRequest: [verifyJwt] }, updateMatch)
  app.delete('/matches/:id', { onRequest: [verifyJwt] }, deleteMatch)
  app.post(
    '/matches/:id/plays',
    { onRequest: [verifyJwt, checkUsage] },
    addPlay,
  )
  app.post(
    '/plays',
    { onRequest: [verifyJwt, checkUsage] },
    createStandalonePlay,
  )
  // Nova rota: Upload direto (backend não toca no vídeo)
  app.post(
    '/plays/with-url',
    { onRequest: [verifyJwt, checkUsage] },
    createPlayWithVideoUrl,
  )
  app.post(
    '/plays/direct-upload',
    { onRequest: [verifyJwt, checkUsage] },
    createPlayWithVideoUrl,
  )
  app.put('/plays/:playId', { onRequest: [verifyJwt] }, updatePlay)
  app.delete('/plays/:id', { onRequest: [verifyJwt] }, deletePlay)
  app.post(
    '/plays/:playId/video',
    { onRequest: [verifyJwt] },
    uploadVideoToPlay,
  )
  // Endpoint para atualizar play com URL do vídeo (quando upload já foi feito para R2)
  app.put(
    '/plays/:playId/video-url',
    { onRequest: [verifyJwt] },
    updatePlayVideoUrl,
  )

  // Video feed route
  app.get('/videos/feed', { onRequest: [verifyJwt] }, getVideoFeed)
  app.get(
    '/videos/upload-url',
    { onRequest: [verifyJwt, checkUsage] },
    generateVideoUploadUrl,
  )
  app.post(
    '/plays/:playId/regenerate-thumbnail',
    { onRequest: [verifyJwt] },
    regenerateThumbnail,
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

  // Admin routes
  app.get(
    '/admin/auth/verify',
    { onRequest: [verifyJwt, verifyAdmin] },
    verifyAdminSession,
  )
  app.get(
    '/admin/search',
    { onRequest: [verifyJwt, verifyAdmin] },
    searchAdmin,
  )
  app.get(
    '/admin/dashboard/overview',
    { onRequest: [verifyJwt, verifyAdmin] },
    dashboardOverviewAdmin,
  )
  app.get(
    '/admin/dashboard/user-growth',
    { onRequest: [verifyJwt, verifyAdmin] },
    dashboardUserGrowthAdmin,
  )
  app.get(
    '/admin/dashboard/user-activity',
    { onRequest: [verifyJwt, verifyAdmin] },
    dashboardUserActivityAdmin,
  )
  app.get(
    '/admin/dashboard/inactivity-buckets',
    { onRequest: [verifyJwt, verifyAdmin] },
    dashboardInactivityBucketsAdmin,
  )
  app.get(
    '/admin/athletes',
    { onRequest: [verifyJwt, verifyAdmin] },
    listAthletesAdmin,
  )
  app.post(
    '/admin/athletes/import',
    { onRequest: [verifyJwt, verifyAdmin], config: { timeout: 300_000 } },
    importAthletesAdmin,
  )
  app.get(
    '/admin/athletes/import/logs',
    { onRequest: [verifyJwt, verifyAdmin] },
    listImportLogsAdmin,
  )
  app.get(
    '/admin/athletes/:id',
    { onRequest: [verifyJwt, verifyAdmin] },
    getAthleteAdmin,
  )
  app.get(
    '/admin/athletes/:athleteId/matches',
    { onRequest: [verifyJwt, verifyAdmin] },
    listAthleteMatchesAdmin,
  )
  app.get(
    '/admin/athletes/:athleteId/plays',
    { onRequest: [verifyJwt, verifyAdmin] },
    listAthletePlaysAdmin,
  )
  app.get(
    '/admin/athletes/:athleteId/achievements',
    { onRequest: [verifyJwt, verifyAdmin] },
    listAthleteAchievementsAdmin,
  )
  app.get(
    '/admin/athletes/:athleteId/team-history',
    { onRequest: [verifyJwt, verifyAdmin] },
    listAthleteTeamHistoryAdmin,
  )
  app.get(
    '/admin/matches',
    { onRequest: [verifyJwt, verifyAdmin] },
    listMatchesAdmin,
  )
  app.post(
    '/admin/matches',
    { onRequest: [verifyJwt, verifyAdmin] },
    createMatchAdmin,
  )
  app.get(
    '/admin/matches/:id',
    { onRequest: [verifyJwt, verifyAdmin] },
    getMatchAdmin,
  )
  app.get(
    '/admin/matches/:id/plays',
    { onRequest: [verifyJwt, verifyAdmin] },
    listMatchPlaysAdmin,
  )
  app.patch(
    '/admin/matches/:id/result',
    { onRequest: [verifyJwt, verifyAdmin] },
    updateMatchResultAdmin,
  )
  app.post(
    '/admin/matches/:id/link-athlete',
    { onRequest: [verifyJwt, verifyAdmin] },
    linkMatchAthleteAdmin,
  )
  app.post(
    '/admin/matches/:matchId/plays',
    { onRequest: [verifyJwt, verifyAdmin] },
    addPlayToMatchAdmin,
  )
  app.get(
    '/admin/videos/upload-url',
    { onRequest: [verifyJwt, verifyAdmin] },
    generateVideoUploadUrlAdmin,
  )
  app.put(
    '/admin/plays/:id/video-url',
    { onRequest: [verifyJwt, verifyAdmin] },
    updatePlayVideoUrlAdmin,
  )
  app.delete(
    '/admin/plays/:id/video-url',
    { onRequest: [verifyJwt, verifyAdmin] },
    removePlayVideoAdmin,
  )
  app.delete(
    '/admin/plays/:id',
    { onRequest: [verifyJwt, verifyAdmin] },
    deletePlayAdmin,
  )

  // Billing routes
  // Rota pública para obter a chave publicável do Stripe (para o frontend)
  app.get('/billing/stripe-config', getStripeConfig)
  // Rota pública para listar planos disponíveis
  app.get('/billing/plans', listPlans)
  // Rota protegida para verificar assinatura e uso atual
  app.get('/billing/subscription', { onRequest: [verifyJwt] }, getSubscription)
  // Rota temporária para verificar correspondência de Price IDs (debug)
  app.get('/billing/check-price-id-match', checkPriceIdMatch)

  app.post('/billing/checkout', { onRequest: [verifyJwt] }, checkout)
  app.post('/billing/portal', { onRequest: [verifyJwt] }, portal)

  // Webhook route - sem autenticação JWT, usa assinatura do Stripe
  app.post(
    '/billing/webhook',
    {
      config: {
        rawBody: true, // Fastify will preserve raw body for this route
      },
      bodyLimit: 1048576, // 1MB
    },
    async (request, reply) => {
      return webhook(request, reply)
    },
  )
}
