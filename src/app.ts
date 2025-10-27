import { fastify } from 'fastify'
import { appRoutes } from './http/routes.js'

export const app = fastify()

app.register(appRoutes, { prefix: '/api' })
