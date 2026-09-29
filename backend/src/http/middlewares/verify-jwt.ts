import type { FastifyReply, FastifyRequest } from 'fastify'

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Não autenticado.' })
  }

  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ message: 'Não autenticado.' })
  }
}
