import { describe, expect, it } from 'vitest'
import {
  assertGuessAllowed,
  assertResendAllowed,
  canSubmitLink,
  ConfirmIdentifierUseCase,
  countResends,
  type ConfirmCodesRepository,
  type StoredCode,
  type StoredIdentifier,
} from '@/use-cases/@Auth/confirm-identifier'
import { InvalidVerificationCodeError } from '@/use-cases/errors/invalid-verification-code-error'
import { RateLimitError } from '@/use-cases/errors/rate-limit-error'

const now = new Date('2026-09-29T16:00:00.000Z')
const inWindow = new Date('2026-09-29T15:30:00.000Z')

class InMemoryConfirmCodesRepository implements ConfirmCodesRepository {
  users = new Map<string, { id: string; status: 'ACTIVE' | 'BANNED' }>()
  identifiers: StoredIdentifier[] = []
  codes: StoredCode[] = []
  private seq = 0

  seedUser(user: { id: string; status: 'ACTIVE' | 'BANNED' }) {
    this.users.set(user.id, user)
  }

  seedIdentifier(row: StoredIdentifier) {
    this.identifiers.push(row)
  }

  seedCode(row: Omit<StoredCode, 'id'> & { id?: string }) {
    this.codes.push({
      id: row.id ?? `code-${++this.seq}`,
      ...row,
    })
  }

  async findUser(userId: string) {
    const user = this.users.get(userId)
    if (!user) {
      return null
    }
    return {
      ...user,
      identifiers: this.identifiers.filter((row) => row.userId === userId),
    }
  }

  async countResendsSince(userIdentifierId: string, since: Date) {
    return this.codes.filter(
      (code) =>
        code.userIdentifierId === userIdentifierId &&
        code.isResend &&
        code.createdAt >= since,
    ).length
  }

  async createCode(data: Omit<StoredCode, 'id' | 'attempts'> & { attempts?: number }) {
    const created: StoredCode = {
      id: `code-${++this.seq}`,
      attempts: data.attempts ?? 0,
      ...data,
    }
    this.codes.push(created)
    return created
  }

  async findLatestLiveCode(userIdentifierId: string, at: Date) {
    return (
      this.codes
        .filter((code) => code.userIdentifierId === userIdentifierId && code.expiresAt > at)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    )
  }

  async incrementAttempts(codeId: string) {
    const code = this.codes.find((row) => row.id === codeId)
    if (!code) {
      throw new Error('código ausente')
    }
    code.attempts += 1
    return code.attempts
  }

  async confirmIdentifier(identifierId: string, at: Date) {
    const identifier = this.identifiers.find((row) => row.id === identifierId)
    if (!identifier) {
      throw new Error('identificador ausente')
    }
    identifier.confirmedAt = at
  }
}

function emailFixture() {
  const repo = new InMemoryConfirmCodesRepository()
  repo.seedUser({ id: 'user-1', status: 'ACTIVE' })
  repo.seedIdentifier({
    id: 'id-email',
    userId: 'user-1',
    kind: 'EMAIL',
    confirmedAt: null,
    replacedAt: null,
  })
  return repo
}

function useCase(repo: InMemoryConfirmCodesRepository) {
  return new ConfirmIdentifierUseCase(repo, {
    now: () => now,
    hashPlain: async (plain) => `hash:${plain}`,
    compareHash: async (plain, hashed) => hashed === `hash:${plain}`,
    generatePlain: () => '123456',
  })
}

function liveCode(
  overrides: Partial<StoredCode> & Pick<StoredCode, 'userIdentifierId' | 'isResend'>,
): Omit<StoredCode, 'id'> {
  return {
    userId: 'user-1',
    kind: 'EMAIL',
    codeHash: 'hash:123456',
    expiresAt: new Date('2026-09-29T17:00:00.000Z'),
    attempts: 0,
    createdAt: inWindow,
    ...overrides,
  }
}

describe('confirmação', () => {
  it('bloqueia envio sem os dois identificadores confirmados', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: false, status: 'ACTIVE',
    })).toBe(false)
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'ACTIVE',
    })).toBe(true)
  })

  it('bloqueia conta banida', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'BANNED',
    })).toBe(false)
  })

  it('para no sexto reenvio da janela', () => {
    expect(() => assertResendAllowed(5)).toThrow(/limite/)
    expect(assertResendAllowed(4)).toBe(true)
  })

  it('para no sexto chute da janela', () => {
    expect(() => assertGuessAllowed(5)).toThrow(/limite/)
    expect(assertGuessAllowed(4)).toBe(true)
  })
})

describe('ConfirmIdentifierUseCase', () => {
  it('bloqueia o 6º reenvio sem contar o código do cadastro', async () => {
    const blocked = emailFixture()
    blocked.seedCode(liveCode({ userIdentifierId: 'id-email', isResend: false }))
    for (let i = 0; i < 5; i += 1) {
      blocked.seedCode(liveCode({ userIdentifierId: 'id-email', isResend: true }))
    }

    expect(countResends(blocked.codes)).toBe(5)
    await expect(
      useCase(blocked).execute({ userId: 'user-1', kind: 'EMAIL', resend: true }),
    ).rejects.toBeInstanceOf(RateLimitError)
    expect(blocked.codes).toHaveLength(6)

    const allowed = emailFixture()
    allowed.seedCode(liveCode({ userIdentifierId: 'id-email', isResend: false }))
    for (let i = 0; i < 4; i += 1) {
      allowed.seedCode(liveCode({ userIdentifierId: 'id-email', isResend: true }))
    }

    await expect(
      useCase(allowed).execute({ userId: 'user-1', kind: 'EMAIL', resend: true }),
    ).resolves.toMatchObject({ resent: true })
    expect(countResends(allowed.codes)).toBe(5)
  })

  it('bloqueia o 6º chute errado na janela', async () => {
    const locked = emailFixture()
    locked.seedCode(
      liveCode({ userIdentifierId: 'id-email', isResend: false, attempts: 5, id: 'otp-1' }),
    )

    await expect(
      useCase(locked).execute({ userId: 'user-1', kind: 'EMAIL', code: '000000' }),
    ).rejects.toBeInstanceOf(RateLimitError)
    expect(locked.codes[0]?.attempts).toBe(5)

    const lastGuess = emailFixture()
    lastGuess.seedCode(
      liveCode({ userIdentifierId: 'id-email', isResend: false, attempts: 4, id: 'otp-2' }),
    )

    await expect(
      useCase(lastGuess).execute({ userId: 'user-1', kind: 'EMAIL', code: '000000' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
    expect(lastGuess.codes[0]?.attempts).toBe(5)
  })

  it('código do identificador substituído não confirma o novo', async () => {
    const repo = emailFixture()
    repo.identifiers[0]!.replacedAt = now
    repo.seedIdentifier({
      id: 'id-email-new',
      userId: 'user-1',
      kind: 'EMAIL',
      confirmedAt: null,
      replacedAt: null,
    })
    repo.seedCode(
      liveCode({ userIdentifierId: 'id-email', isResend: false, codeHash: 'hash:123456' }),
    )

    await expect(
      useCase(repo).execute({ userId: 'user-1', kind: 'EMAIL', code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)

    const current = repo.identifiers.find((row) => row.id === 'id-email-new')
    expect(current?.confirmedAt).toBeNull()
  })
})
