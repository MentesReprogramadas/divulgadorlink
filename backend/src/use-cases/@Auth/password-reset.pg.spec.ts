import Redis from 'ioredis'
import { randomUUID } from 'node:crypto'
import { afterAll, expect, it } from 'vitest'
import { RedisPasswordResetStore, hashResetToken } from './password-reset'

const url = process.env.RESET_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://127.0.0.1:6380'
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local Redis required')
const redis = new Redis(url)
afterAll(async () => { await redis.quit() })

it('pedidos concorrentes deixam somente o token mais recente válido e não atravessam tenant', async () => {
  const tenant = randomUUID(), user = randomUUID(), store = new RedisPasswordResetStore(redis)
  const hashes = Array.from({ length: 20 }, () => hashResetToken(randomUUID()))
  try {
    await Promise.all(hashes.map(hash => store.save(tenant, user, hash, 1800)))
    const current = await redis.get(`pwdreset:user:${tenant}:${user}`)
    expect(current).toBeTruthy()
    expect(await redis.ttl(`pwdreset:token:${tenant}:${current}`)).toBeGreaterThan(0)
    expect(await store.consume('foreign-tenant', current!)).toBeNull()
    const consumed = await Promise.all(hashes.map(hash => store.consume(tenant, hash)))
    expect(consumed.filter(Boolean)).toEqual([user])
    expect(await store.consume(tenant, current!)).toBeNull()
  } finally {
    await redis.del(`pwdreset:user:${tenant}:${user}`, ...hashes.map(hash => `pwdreset:token:${tenant}:${hash}`))
  }
})
