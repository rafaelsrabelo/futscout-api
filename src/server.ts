import { app } from './app.js'
import { env } from './env/index.js'
import { seedPlans } from './setup/plans.js'

seedPlans()
  .then(() => {
    console.log('📊 Seeding completed successfully')
    console.log(`🚀 Starting server on port ${env.PORT}...`)
    console.log(`📝 Environment: ${env.NODE_ENV}`)
    console.log(`🌐 Host: 0.0.0.0`)
    
    return app.listen({
      host: '0.0.0.0',
      port: env.PORT,
    })
  })
  .then(() => {
    console.log(`\n✅ HTTP server running on port ${env.PORT}! 🚀`)
    console.log(`📍 Routes available at:`)
    console.log(`   - http://localhost:${env.PORT}/api/health`)
    console.log(`   - http://localhost:${env.PORT}/api/auth/users`)
    console.log(`\n🔍 All routes are prefixed with /api`)
  })
  .catch((error) => {
    console.error('❌ Error starting server:', error)
    process.exit(1)
  })
