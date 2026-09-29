import type { FastifyReply, FastifyRequest } from 'fastify'
import Redis from 'ioredis'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'

let redis: Redis | undefined

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      lazyConnect: true,
    })
  }
  return redis
}

export async function health(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({ status: 'ok' })
}

export async function live(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({ status: 'ok' })
}

export async function ready(_request: FastifyRequest, reply: FastifyReply) {
  try {
    await prisma.$queryRaw`SELECT 1`
    const client = getRedis()
    if (client.status !== 'ready') {
      await client.connect()
    }
    await client.ping()
    return reply.status(200).send({ status: 'ok' })
  } catch {
    return reply.status(503).send({ status: 'error' })
  }
}
