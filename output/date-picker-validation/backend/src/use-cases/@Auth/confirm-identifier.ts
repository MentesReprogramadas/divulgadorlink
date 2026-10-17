import { randomInt } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { defaultConfirmationDelivery } from '@/adapters/notifications/confirmation-providers'
import type { ConfirmationDelivery } from '@/domain/notifications/confirmation-delivery'
import { InvalidVerificationCodeError } from '@/use-cases/errors/invalid-verification-code-error'
import { RateLimitError } from '@/use-cases/errors/rate-limit-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'

export const RESEND_WINDOW_MS = 60 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000

export function resendRetryAfter(lastSentAt: Date | null, now: Date, cooldownMs = RESEND_COOLDOWN_MS): number {
  if (!lastSentAt) return 0
  const remaining = lastSentAt.getTime() + cooldownMs - now.getTime()
  if (remaining <= 0) return 0
  return Math.ceil(remaining / 1000)
}

export function canSubmitLink(user: {
  emailConfirmed: boolean
  phoneConfirmed: boolean
  status: 'ACTIVE' | 'BANNED'
}): boolean {
  return user.status === 'ACTIVE' && user.emailConfirmed
}

export function confirmIntent(input: { code?: string; resend?: boolean }): { resend: true } | { resend?: false; code: string } {
  const code = input.code?.trim()
  if (input.resend || !code) return { resend: true }
  return { code }
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

export function currentIdentifier<T extends IdentifierSnapshot>(
  identifiers: T[],
  kind: 'EMAIL' | 'PHONE',
): T | undefined {
  return identifiers.find((row) => row.kind === kind && row.replacedAt === null)
}

export type StoredIdentifier = IdentifierSnapshot & {
  userId: string
  normalizedValue: string
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
  latestCodeAt(userIdentifierId: string): Promise<Date | null>
  createCode(
    data: Omit<StoredCode, 'id' | 'attempts'> & { attempts?: number },
  ): Promise<StoredCode>
  findLatestLiveCode(userIdentifierId: string, now: Date): Promise<StoredCode | null>
  incrementAttempts(codeId: string): Promise<number>
  confirmIdentifier(identifierId: string, at: Date): Promise<void>
  identifierTaken(input: { tenantId: string; kind: 'EMAIL' | 'PHONE'; normalizedValue: string }): Promise<boolean>
  replaceIdentifier(input: {
    userId: string
    tenantId: string
    kind: 'EMAIL' | 'PHONE'
    normalizedValue: string
    at: Date
  }): Promise<StoredIdentifier>
}

export class IdentifierChangeForbiddenError extends Error {
  constructor() {
    super('Conta não pode alterar o identificador.')
  }
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
  destination?: string
  emailConfirmed: boolean
  phoneConfirmed: boolean
  canSubmitLink: boolean
  retryAfter?: number
}

export class ConfirmIdentifierUseCase {
  constructor(
    private readonly codes: ConfirmCodesRepository,
    private readonly crypto: ConfirmCrypto,
    private readonly deliver: ConfirmationDelivery = defaultConfirmationDelivery,
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

    return { user, identifier }
  }

  async issueInitialCodes(userId: string): Promise<StoredIdentifier[]> {
    const user = await this.codes.findUser(userId)
    if (!user) {
      throw new ResourceNotFoundError()
    }

    const now = this.now()
    const identifier = currentIdentifier(user.identifiers, 'EMAIL')
    if (!identifier) {
      throw new ResourceNotFoundError('Identificador não encontrado.')
    }
    await this.persistCode(userId, identifier, 'EMAIL', false, now)

    return user.identifiers
  }

  async beginChange(input: {
    userId: string
    tenantId: string
    kind: 'EMAIL' | 'PHONE'
    raw: string
  }): Promise<ConfirmResult> {
    const user = await this.codes.findUser(input.userId)
    if (!user) throw new ResourceNotFoundError()
    if (user.status === 'BANNED') throw new IdentifierChangeForbiddenError()
    const normalized = input.kind === 'EMAIL' ? normalizeEmail(input.raw) : normalizePhone(input.raw)
    if (!normalized) throw new InvalidVerificationCodeError('Identificador inválido.')
    const now = this.now()
    if (await this.codes.identifierTaken({ tenantId: input.tenantId, kind: input.kind, normalizedValue: normalized })) {
      throw new UserAlreadyExistsError()
    }
    const plain = await this.deliverCode(input.userId, input.kind, normalized)
    const created = await this.codes.replaceIdentifier({
      userId: input.userId,
      tenantId: input.tenantId,
      kind: input.kind,
      normalizedValue: normalized,
      at: now,
    })
    await this.storeCode(input.userId, created.id, input.kind, false, now, plain)
    const next = await this.codes.findUser(input.userId)
    if (!next) throw new ResourceNotFoundError()
    return { kind: input.kind, ...this.snapshot(next) }
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

  async status(input: { userId: string; kind: 'EMAIL' | 'PHONE' }): Promise<ConfirmResult> {
    const { user, identifier } = await this.requireCurrent(input.userId, input.kind)
    const lastSentAt = await this.codes.latestCodeAt(identifier.id)
    const flags = this.snapshot(user)
    const confirmed = input.kind === 'EMAIL' ? flags.emailConfirmed : flags.phoneConfirmed
    return {
      kind: input.kind,
      confirmed,
      retryAfter: resendRetryAfter(lastSentAt, this.now()),
      ...flags,
      destination: identifier.normalizedValue,
    }
  }

  private async resend(userId: string, kind: 'EMAIL' | 'PHONE'): Promise<ConfirmResult> {
    const { user, identifier } = await this.requireCurrent(userId, kind)
    const now = this.now()
    const wait = resendRetryAfter(await this.codes.latestCodeAt(identifier.id), now)
    if (wait > 0) throw new RateLimitError('Aguarde para reenviar o código.', wait)
    const sentInWindow = await this.codes.countResendsSince(
      identifier.id,
      new Date(now.getTime() - RESEND_WINDOW_MS),
    )
    assertResendAllowed(sentInWindow)
    await this.persistCode(userId, identifier, kind, true, now)
    return { kind, resent: true, retryAfter: RESEND_COOLDOWN_MS / 1000, ...this.snapshot(user) }
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
    identifier: Pick<StoredIdentifier, 'id' | 'normalizedValue'>,
    kind: 'EMAIL' | 'PHONE',
    isResend: boolean,
    now: Date,
  ): Promise<void> {
    const plain = await this.deliverCode(userId, kind, identifier.normalizedValue)
    await this.storeCode(userId, identifier.id, kind, isResend, now, plain)
  }

  private async deliverCode(userId: string, kind: 'EMAIL' | 'PHONE', destination: string): Promise<string> {
    const plain = this.crypto.generatePlain(kind)
    await this.deliver(kind, { userId, destination, code: plain })
    return plain
  }

  private async storeCode(
    userId: string,
    userIdentifierId: string,
    kind: 'EMAIL' | 'PHONE',
    isResend: boolean,
    now: Date,
    plain: string,
  ): Promise<void> {
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
  normalizedValue: string
  confirmedAt: Date | null
  replacedAt: Date | null
}): StoredIdentifier {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    normalizedValue: row.normalizedValue,
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

  async latestCodeAt(userIdentifierId: string): Promise<Date | null> {
    const row = await this.prisma.verificationCode.findFirst({
      where: { userIdentifierId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    return row?.createdAt ?? null
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

  async identifierTaken(input: { tenantId: string; kind: 'EMAIL' | 'PHONE'; normalizedValue: string }): Promise<boolean> {
    const taken = await this.prisma.userIdentifier.findFirst({
      where: { tenantId: input.tenantId, kind: input.kind, normalizedValue: input.normalizedValue },
      select: { id: true },
    })
    return taken !== null
  }

  async replaceIdentifier(input: {
    userId: string
    tenantId: string
    kind: 'EMAIL' | 'PHONE'
    normalizedValue: string
    at: Date
  }): Promise<StoredIdentifier> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const current = await tx.userIdentifier.findFirst({
          where: { userId: input.userId, kind: input.kind, replacedAt: null },
        })
        if (!current) throw new ResourceNotFoundError('Identificador não encontrado.')
        const taken = await tx.userIdentifier.findFirst({
          where: { tenantId: input.tenantId, kind: input.kind, normalizedValue: input.normalizedValue },
        })
        if (taken) throw new UserAlreadyExistsError()
        await tx.userIdentifier.update({ where: { id: current.id }, data: { replacedAt: input.at } })
        return tx.userIdentifier.create({
          data: {
            userId: input.userId,
            tenantId: input.tenantId,
            kind: input.kind,
            normalizedValue: input.normalizedValue,
            confirmedAt: null,
          },
        })
      })
      return mapIdentifier(created)
    } catch (error) {
      if (error instanceof UserAlreadyExistsError || error instanceof ResourceNotFoundError) throw error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new UserAlreadyExistsError()
      }
      throw error
    }
  }
}
