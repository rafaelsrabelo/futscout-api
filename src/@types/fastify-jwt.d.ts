import '@fastify/jwt'

declare module '@fastify/jwt' {
  export interface FastifyJWT {
    payload: { role: string }
    user: {
      sub: string
      role: string
      iat: number
      exp: number
    }
  }
}
