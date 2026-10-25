import { createHash, randomBytes } from 'node:crypto'
import type Redis from 'ioredis'
import { createRedis } from '@/lib/redis'
import { notifyPasswordReset, publicResetUrl } from '@/adapters/notifications/outbound-mail'
import { env } from '@/env'
import { normalizeEmail } from '@/use-cases/@Auth/confirm-identifier'
import { logDomainEvent } from '@/observability/logger'
import { prisma } from '@/lib/prisma'

export const PASSWORD_RESET_TTL_SECONDS = 30 * 60

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface PasswordResetStore {
  save(tenantId: string, userId: string, tokenHash: string, ttlSeconds: number): Promise<void>
  consume(tenantId: string, tokenHash: string): Promise<string | null>
}

export class MemoryPasswordResetStore implements PasswordResetStore {
  private readonly tokens = new Map<string, { userId: string; expiresAt: number }>()
  private readonly byUser = new Map<string, string>()

  constructor(private readonly now: () => number = Date.now) {}

  async save(tenantId: string, userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    userId = `${tenantId}:${userId}`
    tokenHash = `${tenantId}:${tokenHash}`
    const previous = this.byUser.get(userId)
    if (previous) this.tokens.delete(previous)
    this.tokens.set(tokenHash, { userId, expiresAt: this.now() + ttlSeconds * 1000 })
    this.byUser.set(userId, tokenHash)
  }

  async consume(tenantId: string, tokenHash: string): Promise<string | null> {
    tokenHash = `${tenantId}:${tokenHash}`
    const row = this.tokens.get(tokenHash)
    this.tokens.delete(tokenHash)
    if (!row || row.expiresAt <= this.now()) return null
    if (this.byUser.get(row.userId) === tokenHash) this.byUser.delete(row.userId)
    return row.userId.slice(tenantId.length + 1)
  }

  reset(): void {
    this.tokens.clear()
    this.byUser.clear()
  }
}

export class RedisPasswordResetStore implements PasswordResetStore {
  constructor(private readonly redis: Redis) {}

  async save(tenantId: string, userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    await this.redis.eval(`
      local previous = redis.call('GET', KEYS[1])
      if previous then redis.call('DEL', ARGV[4] .. previous) end
      redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
      redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
      return 1
    `, 2, `pwdreset:user:${tenantId}:${userId}`, `pwdreset:token:${tenantId}:${tokenHash}`,
    userId, tokenHash, ttlSeconds, `pwdreset:token:${tenantId}:`)
  }

  async consume(tenantId: string, tokenHash: string): Promise<string | null> {
    const userId = await this.redis.eval(`
      local userId = redis.call('GETDEL', KEYS[1])
      if not userId then return nil end
      local userKey = ARGV[1] .. userId
      if redis.call('GET', userKey) ~= ARGV[2] then return nil end
      redis.call('DEL', userKey)
      return userId
    `, 1, `pwdreset:token:${tenantId}:${tokenHash}`, `pwdreset:user:${tenantId}:`, tokenHash)
    return typeof userId === 'string' ? userId : null
  }
}

export type PasswordAccount = { id: string; passwordHash: string }

export interface PasswordAccounts {
  findByEmail(tenantId: string, email: string): Promise<PasswordAccount | null>
  setPassword(tenantId: string, userId: string, passwordHash: string): Promise<boolean>
}

export class MemoryPasswordAccounts implements PasswordAccounts {
  readonly users = new Map<string, { tenantId: string; email: string; passwordHash: string }>()

  async findByEmail(tenantId: string, email: string): Promise<PasswordAccount | null> {
    const normalized = normalizeEmail(email)
    for (const [id, user] of this.users) {
      if (user.tenantId === tenantId && user.email === normalized) return { id, passwordHash: user.passwordHash }
    }
    return null
  }

  async setPassword(tenantId: string, userId: string, passwordHash: string): Promise<boolean> {
    const user = this.users.get(userId)
    if (!user || user.tenantId !== tenantId) return false
    user.passwordHash = passwordHash
    return true
  }
}

export class PrismaPasswordAccounts implements PasswordAccounts {
  async findByEmail(tenantId: string, email: string): Promise<PasswordAccount | null> {
    const identifier = await prisma.userIdentifier.findFirst({
      where: { tenantId, kind: 'EMAIL', normalizedValue: normalizeEmail(email), replacedAt: null },
      include: { user: true },
    })
    if (!identifier) return null
    return { id: identifier.userId, passwordHash: identifier.user.passwordHash }
  }

  async setPassword(tenantId: string, userId: string, passwordHash: string): Promise<boolean> {
    const result = await prisma.user.updateMany({ where: { id: userId, tenantId }, data: { passwordHash } })
    return result.count === 1
  }
}

const memoryStore = new MemoryPasswordResetStore()
const memoryAccounts = new MemoryPasswordAccounts()
let redisStore: RedisPasswordResetStore | null = null

export function passwordResetStore(): PasswordResetStore {
  if (process.env.NODE_ENV === 'test') return memoryStore
  if (!redisStore) {
    redisStore = new RedisPasswordResetStore(createRedis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2_000 }))
  }
  return redisStore
}

export function passwordAccounts(): PasswordAccounts {
  if (process.env.NODE_ENV === 'test') return memoryAccounts
  return new PrismaPasswordAccounts()
}

export function resetPasswordResetForTest(): void {
  memoryStore.reset()
  memoryAccounts.users.clear()
}

export function testPasswordAccounts(): MemoryPasswordAccounts {
  return memoryAccounts
}

export async function requestPasswordReset(input: {
  tenantId: string
  tenantName: string
  host: string
  email: string
  token?: string
}): Promise<void> {
  const account = await passwordAccounts().findByEmail(input.tenantId, input.email)
  if (!account) return
  const token = input.token ?? randomBytes(32).toString('base64url')
  await passwordResetStore().save(input.tenantId, account.id, hashResetToken(token), PASSWORD_RESET_TTL_SECONDS)
  try {
    await notifyPasswordReset({
      to: normalizeEmail(input.email),
      url: publicResetUrl(input.host, token),
      name: input.tenantName,
      host: input.host,
    })
  } catch {
    logDomainEvent('notification.delivery', {
      channel: 'EMAIL',
      kind: 'password_reset',
      status: 'failure',
      reason: 'provider_error',
    })
  }
}

export async function resetPassword(input: {
  tenantId: string
  token: string
  passwordHash: string
}): Promise<boolean> {
  const userId = await passwordResetStore().consume(input.tenantId, hashResetToken(input.token))
  if (!userId) return false
  return passwordAccounts().setPassword(input.tenantId, userId, input.passwordHash)
}
