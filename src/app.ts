import { fastify } from 'fastify'
import { appRoutes } from './http/routes.js'
import { ZodError } from 'zod'
import { env } from './env/index.js'

export const app = fastify()

// Register JWT plugin
app.register(import('@fastify/jwt'), {
  secret: env.JWT_SECRET,
})

app.register(appRoutes, { prefix: '/api' })

app.setErrorHandler((error, _, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      issues: error.format(),
    })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error)
  } else {
    // Here you can integrate with a logging service like Sentry, LogRocket, etc.
  }

  return reply.status(500).send({
    message: 'Internal server error',
  })
})
