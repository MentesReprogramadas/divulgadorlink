import { describe, expect, it } from 'vitest'
import {
  assertGuessAllowed,
  assertResendAllowed,
  canSubmitLink,
  confirmIntent,
  ConfirmIdentifierUseCase,
  countResends,
  IdentifierChangeForbiddenError,
  resendRetryAfter,
  type ConfirmCodesRepository,
  type StoredCode,
  type StoredIdentifier,
} from '@/use-cases/@Auth/confirm-identifier'
import {
  type ConfirmationDelivery,
  DeliveryUnavailableError,
} from '@/domain/notifications/confirmation-delivery'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { InvalidVerificationCodeError } from '@/use-cases/errors/invalid-verification-code-error'
import { RateLimitError } from '@/use-cases/errors/rate-limit-error'

describe('pedido de confirmação', () => {
  it('sem código pede o envio', () => {
    expect(confirmIntent({})).toEqual({ resend: true })
    expect(confirmIntent({ code: '  ' })).toEqual({ resend: true })
    expect(confirmIntent({ resend: true, code: '123456' })).toEqual({ resend: true })
  })

  it('com código confirma esse código', () => {
    expect(confirmIntent({ code: ' 123456 ' })).toEqual({ code: '123456' })
  })
})

const now = new Date('2026-09-29T16:00:00.000Z')
const inWindow = new Date('2026-09-29T15:30:00.000Z')

class InMemoryConfirmCodesRepository implements ConfirmCodesRepository {
  users = new Map<string, { id: string; status: 'ACTIVE' | 'BANNED' }>()
  identifiers: StoredIdentifier[] = []
  codes: StoredCode[] = []
  private seq = 0
  private values = new Map<string, string>()

  seedUser(user: { id: string; status: 'ACTIVE' | 'BANNED' }) {
    this.users.set(user.id, user)
  }

  seedIdentifier(row: StoredIdentifier) {
    this.identifiers.push(row)
  }

  remember(id: string, value: string) {
    this.values.set(id, value)
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

  async latestCodeAt(userIdentifierId: string) {
    const latest = this.codes
      .filter((code) => code.userIdentifierId === userIdentifierId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    return latest?.createdAt ?? null
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

  async identifierTaken(input: { normalizedValue: string }) {
    return [...this.values.values()].includes(input.normalizedValue)
  }

  async replaceIdentifier(input: {
    userId: string
    tenantId: string
    kind: 'EMAIL' | 'PHONE'
    normalizedValue: string
    at: Date
  }) {
    const current = this.identifiers.find((row) => row.userId === input.userId && row.kind === input.kind && row.replacedAt === null)
    if (!current) throw new Error('identificador ausente')
    const taken = [...this.values.entries()].find(([, value]) => value === input.normalizedValue)
    if (taken) throw new UserAlreadyExistsError()
    current.replacedAt = input.at
    const created: StoredIdentifier = {
      id: `id-${++this.seq}`,
      userId: input.userId,
      kind: input.kind,
      normalizedValue: input.normalizedValue,
      confirmedAt: null,
      replacedAt: null,
    }
    this.values.set(created.id, input.normalizedValue)
    this.values.set(current.id, this.values.get(current.id) ?? 'old')
    this.identifiers.push(created)
    return created
  }
}

function emailFixture() {
  const repo = new InMemoryConfirmCodesRepository()
  repo.seedUser({ id: 'user-1', status: 'ACTIVE' })
  repo.seedIdentifier({
    id: 'id-email',
    userId: 'user-1',
    kind: 'EMAIL',
    normalizedValue: 'ana@example.com',
    confirmedAt: null,
    replacedAt: null,
  })
  return repo
}

type Delivered = { channel: 'EMAIL' | 'PHONE'; destination: string; code: string }

function useCase(repo: InMemoryConfirmCodesRepository, deliver?: ConfirmationDelivery) {
  const sent: Delivered[] = []
  const clock = { time: now }
  const fallback: ConfirmationDelivery = async (channel, message) => {
    sent.push({ channel, destination: message.destination, code: message.code })
  }
  return Object.assign(new ConfirmIdentifierUseCase(repo, {
    now: () => clock.time,
    hashPlain: async (plain) => `hash:${plain}`,
    compareHash: async (plain, hashed) => hashed === `hash:${plain}`,
    generatePlain: () => '123456',
  }, deliver ?? fallback), { sent, clock })
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
  it('libera o envio com o e-mail confirmado', () => {
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: false, status: 'ACTIVE',
    })).toBe(true)
    expect(canSubmitLink({
      emailConfirmed: true, phoneConfirmed: true, status: 'ACTIVE',
    })).toBe(true)
    expect(canSubmitLink({
      emailConfirmed: false, phoneConfirmed: true, status: 'ACTIVE',
    })).toBe(false)
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

  it('calcula os segundos que faltam para reenviar', () => {
    expect(resendRetryAfter(null, now)).toBe(0)
    expect(resendRetryAfter(new Date(now.getTime() - 61_000), now)).toBe(0)
    expect(resendRetryAfter(new Date(now.getTime() - 20_000), now)).toBe(40)
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
      normalizedValue: 'nova@example.com',
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

  it('troca o e-mail sem devolver o código e só libera o envio depois da confirmação', async () => {
    const repo = emailFixture()
    repo.identifiers[0]!.confirmedAt = now
    repo.seedIdentifier({ id: 'id-phone', userId: 'user-1', kind: 'PHONE', normalizedValue: '5511911110001', confirmedAt: now, replacedAt: null })
    repo.remember('id-email', 'ana@example.com')
    await expect(useCase(repo).beginChange({
      userId: 'user-1', tenantId: 'tenant', kind: 'EMAIL', raw: 'ana@example.com',
    })).rejects.toBeInstanceOf(UserAlreadyExistsError)

    const changed = await useCase(repo).beginChange({
      userId: 'user-1', tenantId: 'tenant', kind: 'EMAIL', raw: ' Novo@Exemplo.com ',
    })
    expect(changed.emailConfirmed).toBe(false)
    expect(changed.canSubmitLink).toBe(false)
    expect(changed).not.toHaveProperty('code')
    expect(JSON.stringify(changed)).not.toContain('123456')
    expect(repo.identifiers.find((row) => row.id === 'id-email')?.replacedAt).toEqual(now)
    const confirmed = await useCase(repo).execute({ userId: 'user-1', kind: 'EMAIL', code: '123456' })
    expect(confirmed.canSubmitLink).toBe(true)
    expect(repo.identifiers.find((row) => row.id === 'id-email')?.replacedAt).toEqual(now)
  })

  it('troca o telefone e só confirma o identificador novo', async () => {
    const repo = emailFixture()
    repo.identifiers[0]!.confirmedAt = now
    repo.seedIdentifier({ id: 'id-phone', userId: 'user-1', kind: 'PHONE', normalizedValue: '5511911110001', confirmedAt: now, replacedAt: null })
    repo.remember('id-phone', '5511911110001')
    const changed = await useCase(repo).beginChange({
      userId: 'user-1', tenantId: 'tenant', kind: 'PHONE', raw: '+55 (11) 98888-7777',
    })
    expect(changed.phoneConfirmed).toBe(false)
    expect(changed.canSubmitLink).toBe(true)
    expect(repo.identifiers.find((row) => row.id === 'id-phone')?.replacedAt).toEqual(now)
    const confirmed = await useCase(repo).execute({ userId: 'user-1', kind: 'PHONE', code: '123456' })
    expect(confirmed.phoneConfirmed).toBe(true)
    expect(confirmed.canSubmitLink).toBe(true)
  })

  it('entrega o código ao destino normalizado do identificador novo', async () => {
    const repo = emailFixture()
    const confirm = useCase(repo)
    await confirm.beginChange({ userId: 'user-1', tenantId: 'tenant', kind: 'EMAIL', raw: ' Novo@Exemplo.com ' })
    expect(confirm.sent).toEqual([{ channel: 'EMAIL', destination: 'novo@exemplo.com', code: '123456' }])

    confirm.clock.time = new Date(now.getTime() + 61_000)
    await confirm.execute({ userId: 'user-1', kind: 'EMAIL', resend: true })
    expect(confirm.sent).toHaveLength(2)
    expect(confirm.sent[1]).toEqual({ channel: 'EMAIL', destination: 'novo@exemplo.com', code: '123456' })
  })

  it('recusa reenvio dentro de 60 segundos e devolve o tempo restante', async () => {
    const repo = emailFixture()
    const confirm = useCase(repo)
    await confirm.execute({ userId: 'user-1', kind: 'EMAIL', resend: true })
    confirm.clock.time = new Date(now.getTime() + 20_000)
    await expect(confirm.execute({ userId: 'user-1', kind: 'EMAIL', resend: true })).rejects.toMatchObject({
      message: 'Aguarde para reenviar o código.',
      retryAfter: 40,
    })
    expect(repo.codes).toHaveLength(1)
  })

  it('falha de entrega não grava código nem consome o limite de reenvio', async () => {
    const repo = emailFixture()
    const failing: ConfirmationDelivery = async (channel) => {
      throw new DeliveryUnavailableError(channel, 'provider_selection_required')
    }
    await expect(useCase(repo, failing).execute({ userId: 'user-1', kind: 'EMAIL', resend: true }))
      .rejects.toBeInstanceOf(DeliveryUnavailableError)
    await expect(useCase(repo, failing).issueInitialCodes('user-1')).rejects.toBeInstanceOf(DeliveryUnavailableError)
    expect(repo.codes).toHaveLength(0)
  })

  it('falha de entrega na troca mantém o identificador confirmado atual', async () => {
    const repo = emailFixture()
    repo.identifiers[0]!.confirmedAt = now
    const failing: ConfirmationDelivery = async (channel) => {
      throw new DeliveryUnavailableError(channel, 'provider_selection_required')
    }
    await expect(useCase(repo, failing).beginChange({
      userId: 'user-1', tenantId: 'tenant', kind: 'EMAIL', raw: 'novo@exemplo.com',
    })).rejects.toBeInstanceOf(DeliveryUnavailableError)
    expect(repo.identifiers).toHaveLength(1)
    expect(repo.identifiers[0]).toMatchObject({ id: 'id-email', confirmedAt: now, replacedAt: null })
    expect(repo.codes).toHaveLength(0)
  })

  it('identificador de outra conta falha antes de qualquer entrega', async () => {
    const repo = emailFixture()
    repo.remember('id-outra', 'ocupado@exemplo.com')
    const confirm = useCase(repo)
    await expect(confirm.beginChange({
      userId: 'user-1', tenantId: 'tenant', kind: 'EMAIL', raw: 'Ocupado@Exemplo.com',
    })).rejects.toBeInstanceOf(UserAlreadyExistsError)
    expect(confirm.sent).toHaveLength(0)
    expect(repo.identifiers[0]?.replacedAt).toBeNull()
  })

  it('conta banida não troca o telefone', async () => {
    const repo = emailFixture()
    repo.users.set('user-1', { id: 'user-1', status: 'BANNED' })
    repo.seedIdentifier({ id: 'id-phone', userId: 'user-1', kind: 'PHONE', normalizedValue: '5511911110001', confirmedAt: now, replacedAt: null })
    await expect(useCase(repo).beginChange({
      userId: 'user-1', tenantId: 'tenant', kind: 'PHONE', raw: '11988887777',
    })).rejects.toBeInstanceOf(IdentifierChangeForbiddenError)
    expect(repo.identifiers.find((row) => row.id === 'id-phone')?.replacedAt).toBeNull()
  })
})
