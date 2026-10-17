import type Redis from 'ioredis'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

const PREFIX = 'refresh:revoked:'
const REFRESH_FALLBACK_TTL_SECONDS = 7 * 24 * 60 * 60

let client: Redis | null = null

function redis(): Redis {
  if (!client) {
    client = createRedis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2_000 })
  }
  return client
}

export function refreshTtlSeconds(exp: number | undefined, now = Date.now()): number {
  if (!exp) return REFRESH_FALLBACK_TTL_SECONDS
  return Math.max(1, exp - Math.floor(now / 1000))
}

export async function revokeRefreshJti(jti: string, ttlSeconds: number): Promise<void> {
  await redis().set(`${PREFIX}${jti}`, '1', 'EX', Math.max(1, ttlSeconds))
}

export async function isRefreshRevoked(jti: string): Promise<boolean> {
  return (await redis().exists(`${PREFIX}${jti}`)) === 1
}

export async function forgetRefreshJti(jti: string): Promise<void> {
  await redis().del(`${PREFIX}${jti}`)
}

export async function resetRefreshRevocationsForTest(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') return
  await forgetRefreshJti('jti-1')
  await forgetRefreshJti('jti-b')
}
