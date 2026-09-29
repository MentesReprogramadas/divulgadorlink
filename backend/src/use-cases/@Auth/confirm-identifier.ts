import { randomInt } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { InvalidVerificationCodeError } from '@/use-cases/errors/invalid-verification-code-error'
import { RateLimitError } from '@/use-cases/errors/rate-limit-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export const RESEND_WINDOW_MS = 60 * 60 * 1000

export function canSubmitLink(user: {
  emailConfirmed: boolean
  phoneConfirmed: boolean
  status: 'ACTIVE' | 'BANNED'
}): boolean {
  return user.status === 'ACTIVE' && user.emailConfirmed && user.phoneConfirmed
}

export function assertResendAllowed(sentInWindow: number): true {
  if (sentInWindow >= 5) throw new RateLimitError('limite de reenvio')
  return true
}

export function assertGuessAllowed(failedAttempts: number): true {
  if (failedAttempts >= 5) throw new RateLimitError('limite de tentativas')
  return true
}

export function countResends(codes: Array<{ isResend: boolean }>): number {
  return codes.filter((code) => code.isResend).length
}

export function codeBelongsToIdentifier(
  code: { userIdentifierId: string },
  identifierId: string,
): boolean {
  return code.userIdentifierId === identifierId
}

export function generatePlainCode(
  kind: 'EMAIL' | 'PHONE',
  nodeEnv = process.env.NODE_ENV,
): string {
  if (nodeEnv === 'test') {
    return kind === 'EMAIL' ? '000001' : '000002'
  }
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export type IdentifierSnapshot = {
  id: string
  kind: 'EMAIL' | 'PHONE'
  confirmedAt: Date | null
  replacedAt: Date | null
}

export function confirmationFlags(identifiers: IdentifierSnapshot[]): {
  emailConfirmed: boolean
  phoneConfirmed: boolean
} {
  const current = identifiers.filter((row) => row.replacedAt === null)
  const email = current.find((row) => row.kind === 'EMAIL')
  const phone = current.find((row) => row.kind === 'PHONE')
  return {
    emailConfirmed: Boolean(email?.confirmedAt),
    phoneConfirmed: Boolean(phone?.confirmedAt),
  }
}

export function canSubmitLinkFromIdentifiers(
  status: 'ACTIVE' | 'BANNED',
  identifiers: IdentifierSnapshot[],
): boolean {
  return canSubmitLink({ ...confirmationFlags(identifiers), status })
}

export function currentIdentifier(
  identifiers: IdentifierSnapshot[],
  kind: 'EMAIL' | 'PHONE',
): IdentifierSnapshot | undefined {
  return identifiers.find((row) => row.kind === kind && row.replacedAt === null)
}

export type StoredIdentifier = IdentifierSnapshot & {
  userId: string
}

export type StoredCode = {
  id: string
  userId: string
  userIdentifierId: string
  kind: 'EMAIL' | 'PHONE'
  codeHash: string
  expiresAt: Date
  attempts: number
  isResend: boolean
  createdAt: Date
}

export type ConfirmUser = {
  id: string
  status: 'ACTIVE' | 'BANNED'
  identifiers: StoredIdentifier[]
}

export interface ConfirmCodesRepository {
  findUser(userId: string): Promise<ConfirmUser | null>
  countResendsSince(userIdentifierId: string, since: Date): Promise<number>
  createCode(
    data: Omit<StoredCode, 'id' | 'attempts'> & { attempts?: number },
  ): Promise<StoredCode>
  findLatestLiveCode(userIdentifierId: string, now: Date): Promise<StoredCode | null>
  incrementAttempts(codeId: string): Promise<number>
  confirmIdentifier(identifierId: string, at: Date): Promise<void>
}

export type ConfirmCrypto = {
  now?: () => Date
  hashPlain: (plain: string) => Promise<string>
  compareHash: (plain: string, hash: string) => Promise<boolean>
  generatePlain: (kind: 'EMAIL' | 'PHONE') => string
}

export type ConfirmInput = {
  userId: string
  kind: 'EMAIL' | 'PHONE'
  code?: string
  resend?: boolean
}

export type ConfirmResult = {
  kind: 'EMAIL' | 'PHONE'
  resent?: boolean
  confirmed?: boolean
  emailConfirmed: boolean
  phoneConfirmed: boolean
  canSubmitLink: boolean
}

export class ConfirmIdentifierUseCase {
  constructor(
    private readonly codes: ConfirmCodesRepository,
    private readonly crypto: ConfirmCrypto,
  ) {}

  private now(): Date {
    return this.crypto.now?.() ?? new Date()
  }

  private snapshot(user: ConfirmUser): Omit<ConfirmResult, 'kind' | 'resent' | 'confirmed'> {
    const flags = confirmationFlags(user.identifiers)
    return {
      ...flags,
      canSubmitLink: canSubmitLinkFromIdentifiers(user.status, user.identifiers),
    }
  }

  private async requireCurrent(
    userId: string,
    kind: 'EMAIL' | 'PHONE',
  ): Promise<{ user: ConfirmUser; identifier: StoredIdentifier }> {
    const user = await this.codes.findUser(userId)
    if (!user) {
      throw new ResourceNotFoundError()
    }

    const identifier = currentIdentifier(user.identifiers, kind)
    if (!identifier) {
      throw new ResourceNotFoundError('Identificador não encontrado.')
    }

    return { user, identifier: identifier as StoredIdentifier }
  }

  async issueInitialCodes(userId: string): Promise<StoredIdentifier[]> {
    const user = await this.codes.findUser(userId)
    if (!user) {
      throw new ResourceNotFoundError()
    }

    const now = this.now()
    for (const kind of ['EMAIL', 'PHONE'] as const) {
      const identifier = currentIdentifier(user.identifiers, kind)
      if (!identifier) {
        throw new ResourceNotFoundError('Identificador não encontrado.')
      }
      await this.persistCode(userId, identifier.id, kind, false, now)
    }

    return user.identifiers
  }

  async execute(input: ConfirmInput): Promise<ConfirmResult> {
    if (input.resend) {
      return this.resend(input.userId, input.kind)
    }
    if (!input.code) {
      throw new InvalidVerificationCodeError('Informe o código ou solicite reenvio.')
    }
    return this.confirm(input.userId, input.kind, input.code)
  }

  private async resend(userId: string, kind: 'EMAIL' | 'PHONE'): Promise<ConfirmResult> {
    const { user, identifier } = await this.requireCurrent(userId, kind)
    const now = this.now()
    const sentInWindow = await this.codes.countResendsSince(
      identifier.id,
      new Date(now.getTime() - RESEND_WINDOW_MS),
    )
    assertResendAllowed(sentInWindow)
    await this.persistCode(userId, identifier.id, kind, true, now)
    return { kind, resent: true, ...this.snapshot(user) }
  }

  private async confirm(
    userId: string,
    kind: 'EMAIL' | 'PHONE',
    code: string,
  ): Promise<ConfirmResult> {
    const { identifier } = await this.requireCurrent(userId, kind)
    const now = this.now()
    const latest = await this.codes.findLatestLiveCode(identifier.id, now)
    if (!latest || !codeBelongsToIdentifier(latest, identifier.id)) {
      throw new InvalidVerificationCodeError()
    }

    assertGuessAllowed(latest.attempts)

    const matches = await this.crypto.compareHash(code, latest.codeHash)
    if (!matches) {
      await this.codes.incrementAttempts(latest.id)
      throw new InvalidVerificationCodeError()
    }

    await this.codes.confirmIdentifier(identifier.id, now)
    const confirmed = await this.codes.findUser(userId)
    if (!confirmed) {
      throw new ResourceNotFoundError()
    }

    return { kind, confirmed: true, ...this.snapshot(confirmed) }
  }

  private async persistCode(
    userId: string,
    userIdentifierId: string,
    kind: 'EMAIL' | 'PHONE',
    isResend: boolean,
    now: Date,
  ): Promise<void> {
    const plain = this.crypto.generatePlain(kind)
    const codeHash = await this.crypto.hashPlain(plain)
    await this.codes.createCode({
      userId,
      userIdentifierId,
      kind,
      codeHash,
      expiresAt: new Date(now.getTime() + RESEND_WINDOW_MS),
      isResend,
      createdAt: now,
    })
  }
}

function mapIdentifier(row: {
  id: string
  userId: string
  kind: 'EMAIL' | 'PHONE'
  confirmedAt: Date | null
  replacedAt: Date | null
}): StoredIdentifier {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    confirmedAt: row.confirmedAt,
    replacedAt: row.replacedAt,
  }
}

function mapCode(row: {
  id: string
  userId: string
  userIdentifierId: string
  kind: 'EMAIL' | 'PHONE'
  codeHash: string
  expiresAt: Date
  attempts: number
  isResend: boolean
  createdAt: Date
}): StoredCode {
  return {
    id: row.id,
    userId: row.userId,
    userIdentifierId: row.userIdentifierId,
    kind: row.kind,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt,
    attempts: row.attempts,
    isResend: row.isResend,
    createdAt: row.createdAt,
  }
}

export class PrismaConfirmCodesRepository implements ConfirmCodesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUser(userId: string): Promise<ConfirmUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { identifiers: true },
    })
    if (!user) {
      return null
    }
    return {
      id: user.id,
      status: user.status,
      identifiers: user.identifiers.map(mapIdentifier),
    }
  }

  async countResendsSince(userIdentifierId: string, since: Date): Promise<number> {
    return this.prisma.verificationCode.count({
      where: {
        userIdentifierId,
        isResend: true,
        createdAt: { gte: since },
      },
    })
  }

  async createCode(
    data: Omit<StoredCode, 'id' | 'attempts'> & { attempts?: number },
  ): Promise<StoredCode> {
    const created = await this.prisma.verificationCode.create({
      data: {
        userId: data.userId,
        userIdentifierId: data.userIdentifierId,
        kind: data.kind,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
        isResend: data.isResend,
        attempts: data.attempts ?? 0,
        createdAt: data.createdAt,
      },
    })
    return mapCode(created)
  }

  async findLatestLiveCode(userIdentifierId: string, now: Date): Promise<StoredCode | null> {
    const latest = await this.prisma.verificationCode.findFirst({
      where: {
        userIdentifierId,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })
    return latest ? mapCode(latest) : null
  }

  async incrementAttempts(codeId: string): Promise<number> {
    const updated = await this.prisma.verificationCode.update({
      where: { id: codeId },
      data: { attempts: { increment: 1 } },
    })
    return updated.attempts
  }

  async confirmIdentifier(identifierId: string, at: Date): Promise<void> {
    await this.prisma.userIdentifier.update({
      where: { id: identifierId },
      data: { confirmedAt: at },
    })
  }
}
