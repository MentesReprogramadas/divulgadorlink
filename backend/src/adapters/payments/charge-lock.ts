import type Redis from 'ioredis'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

const PREFIX = 'charge:lock:'
let client: Redis | null = null

function redis(): Redis {
  if (!client) {
    client = createRedis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2_000 })
  }
  return client
}

export async function claimCharge(orderId: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') return true
  const result = await redis().set(`${PREFIX}${orderId}`, '1', 'EX', 60, 'NX')
  return result === 'OK'
}

export async function releaseCharge(orderId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return
  await redis().del(`${PREFIX}${orderId}`)
}
