import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      role: string
      tenantId: string
      typ: 'access' | 'refresh'
    }
    user: {
      sub: string
      role: string
      tenantId: string
      typ: 'access' | 'refresh'
    }
  }
}
