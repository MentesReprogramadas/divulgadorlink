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
  save(userId: string, tokenHash: string, ttlSeconds: number): Promise<void>
  consume(tokenHash: string): Promise<string | null>
}

export class MemoryPasswordResetStore implements PasswordResetStore {
  private readonly tokens = new Map<string, { userId: string; expiresAt: number }>()
  private readonly byUser = new Map<string, string>()

  constructor(private readonly now: () => number = Date.now) {}

  async save(userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    const previous = this.byUser.get(userId)
    if (previous) this.tokens.delete(previous)
    this.tokens.set(tokenHash, { userId, expiresAt: this.now() + ttlSeconds * 1000 })
    this.byUser.set(userId, tokenHash)
  }

  async consume(tokenHash: string): Promise<string | null> {
    const row = this.tokens.get(tokenHash)
    this.tokens.delete(tokenHash)
    if (!row || row.expiresAt <= this.now()) return null
    if (this.byUser.get(row.userId) === tokenHash) this.byUser.delete(row.userId)
    return row.userId
  }

  reset(): void {
    this.tokens.clear()
    this.byUser.clear()
  }
}

export class RedisPasswordResetStore implements PasswordResetStore {
  constructor(private readonly redis: Redis) {}

  async save(userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    const previous = await this.redis.get(`pwdreset:user:${userId}`)
    const multi = this.redis.multi()
    if (previous) multi.del(`pwdreset:token:${previous}`)
    multi.set(`pwdreset:token:${tokenHash}`, userId, 'EX', ttlSeconds)
    multi.set(`pwdreset:user:${userId}`, tokenHash, 'EX', ttlSeconds)
    await multi.exec()
  }

  async consume(tokenHash: string): Promise<string | null> {
    const userId = await this.redis.getdel(`pwdreset:token:${tokenHash}`)
    if (!userId) return null
    await this.redis.del(`pwdreset:user:${userId}`)
    return userId
  }
}

export type PasswordAccount = { id: string; passwordHash: string }

export interface PasswordAccounts {
  findByEmail(tenantId: string, email: string): Promise<PasswordAccount | null>
  setPassword(userId: string, passwordHash: string): Promise<boolean>
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

  async setPassword(userId: string, passwordHash: string): Promise<boolean> {
    const user = this.users.get(userId)
    if (!user) return false
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

  async setPassword(userId: string, passwordHash: string): Promise<boolean> {
    const result = await prisma.user.updateMany({ where: { id: userId }, data: { passwordHash } })
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
  await passwordResetStore().save(account.id, hashResetToken(token), PASSWORD_RESET_TTL_SECONDS)
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
  token: string
  passwordHash: string
}): Promise<boolean> {
  const userId = await passwordResetStore().consume(hashResetToken(input.token))
  if (!userId) return false
  return passwordAccounts().setPassword(userId, input.passwordHash)
}
