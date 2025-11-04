import { fastify } from 'fastify'
import { appRoutes } from './http/routes.js'
import { ZodError } from 'zod'
import { env } from './env/index.js'
import { AthleteProfileNotFoundError } from './http/use-cases/create-match.js'
import {
  MatchNotFoundError,
  MatchNotBelongsToAthleteError,
} from './http/use-cases/get-match.js'

export const app = fastify()

// Register JWT plugin
app.register(import('@fastify/jwt'), {
  secret: env.JWT_SECRET,
})

app.register(appRoutes, { prefix: '/api' })

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      issues: error.format(),
    })
  }

  if (error instanceof AthleteProfileNotFoundError) {
    return reply.status(400).send({
      message:
        'Athlete profile not found. Please create your athlete profile first.',
    })
  }

  if (error instanceof MatchNotFoundError) {
    return reply.status(404).send({
      message: 'Match not found',
    })
  }

  if (error instanceof MatchNotBelongsToAthleteError) {
    return reply.status(403).send({
      message: 'Access denied',
    })
  }

  // Log all unhandled errors for debugging
  console.error('Unhandled error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    constructor: error.constructor.name,
  })

  return reply.status(500).send({
    message: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && {
      error: error.message,
      stack: error.stack,
    }),
  })
})
