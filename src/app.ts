import { fastify } from 'fastify'
import { appRoutes } from './http/routes.js'
import { ZodError } from 'zod'

export const app = fastify()

app.register(appRoutes, { prefix: '/api' })

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      issues: error.format(),
    })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error)
  }

  return reply.status(500).send({
    message: 'Internal server error',
  })
})
