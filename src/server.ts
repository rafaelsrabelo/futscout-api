import { app } from './app.js'
import { env } from './env/index.js'
import { seedAdmin } from './setup/admin.js'
import { seedPlans } from './setup/plans.js'

seedPlans()
  .then(() => seedAdmin())
  .then(() => {
    return app.listen({
      host: '0.0.0.0',
      port: env.PORT,
    })
  })
  .then(() => {
  })
  .catch((error) => {
    console.error('❌ Error starting server:', error)
    process.exit(1)
  })
