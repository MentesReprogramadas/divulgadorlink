import type { FastifyReply, FastifyRequest } from 'fastify'

export async function health(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({ status: 'ok' })
}
