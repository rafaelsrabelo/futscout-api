import '@fastify/jwt'

declare module '@fastify/jwt' {
  export interface FastifyJWT {
    // `role` é o payload das sessões normais; `scope`/`codeId` são usados
    // apenas pelo resetToken do fluxo de redefinição de senha.
    payload: { role?: string; scope?: string; codeId?: string }
    user: {
      sub: string
      role: string
      iat: number
      exp: number
      scope?: string
      codeId?: string
    }
  }
}
