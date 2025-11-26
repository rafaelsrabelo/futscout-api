import { app } from './app.js'
import { env } from './env/index.js'
import { seedPlans } from './setup/plans.js'

seedPlans()
  .then(() => {
    return app.listen({
      host: '0.0.0.0',
      port: env.PORT,
    })
  })
  .then(() => {
    console.log(`HTTP server running on port ${env.PORT}! 🚀`)
  })
  .catch((error) => {
    console.error('Error starting server:', error)
    process.exit(1)
  })
