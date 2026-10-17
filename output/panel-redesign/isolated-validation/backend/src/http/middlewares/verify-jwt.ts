import type { FastifyReply, FastifyRequest } from 'fastify'

export async function readAccessUser(request: FastifyRequest): Promise<FastifyRequest['user'] | null> {
  const authorization = request.headers.authorization
  const bearer = typeof authorization === 'string' && authorization.startsWith('Bearer ')
  const cookie = request.cookies.accessToken
  try {
    if (bearer) {
      await request.jwtVerify()
    } else if (typeof cookie === 'string' && cookie.length > 0) {
      request.user = request.server.jwt.verify<FastifyRequest['user']>(cookie)
    } else {
      return null
    }
  } catch {
    return null
  }
  if (request.user.typ === 'refresh') return null
  return request.user
}

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  if (!(await readAccessUser(request))) {
    return reply.status(401).send({ message: 'Não autenticado.' })
  }
}
