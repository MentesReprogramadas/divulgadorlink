import { randomBytes } from 'node:crypto'
import { hash } from 'bcryptjs'
import { notifyAccountDeleted } from '@/adapters/notifications/outbound-mail'
import { prisma } from '@/lib/prisma'

export class WrongPasswordError extends Error {
  constructor() {
    super('Credenciais inválidas.')
  }
}

export type DeletionAccount = {
  id: string
  name: string
  passwordHash: string
  email: string | null
}

export interface AccountDeletionRepository {
  find(tenantId: string, userId: string): Promise<DeletionAccount | null>
  anonymize(userId: string): Promise<void>
}

export class MemoryAccountDeletionRepository implements AccountDeletionRepository {
  readonly users = new Map<string, DeletionAccount & { tenantId: string; wiped: boolean }>()

  async find(tenantId: string, userId: string): Promise<DeletionAccount | null> {
    const user = this.users.get(userId)
    if (!user || user.tenantId !== tenantId) return null
    return user
  }

  async anonymize(userId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) return
    user.name = 'Conta excluída'
    user.email = null
    user.passwordHash = 'wiped'
    user.wiped = true
  }
}

export class PrismaAccountDeletionRepository implements AccountDeletionRepository {
  async find(tenantId: string, userId: string): Promise<DeletionAccount | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { identifiers: { where: { kind: 'EMAIL', replacedAt: null } } },
    })
    if (!user) return null
    return {
      id: user.id,
      name: user.name,
      passwordHash: user.passwordHash,
      email: user.identifiers[0]?.normalizedValue ?? null,
    }
  }

  async anonymize(userId: string): Promise<void> {
    const passwordHash = await hash(randomBytes(32).toString('hex'), 12)
    await prisma.$transaction(async (tx) => {
      await tx.verificationCode.deleteMany({ where: { userId } })
      await tx.userIdentifier.deleteMany({ where: { userId } })
      await tx.link.updateMany({ where: { ownerId: userId }, data: { ownerId: null } })
      await tx.order.updateMany({ where: { userId }, data: { userId: null } })
      await tx.user.update({
        where: { id: userId },
        data: { name: 'Conta excluída', passwordHash },
      })
    })
  }
}

const memoryDeletion = new MemoryAccountDeletionRepository()

export function accountDeletionRepository(): AccountDeletionRepository {
  if (process.env.NODE_ENV === 'test') return memoryDeletion
  return new PrismaAccountDeletionRepository()
}

export function resetAccountDeletionForTest(): void {
  memoryDeletion.users.clear()
}

export function testAccountDeletion(): MemoryAccountDeletionRepository {
  return memoryDeletion
}

export async function deleteAccount(input: {
  tenantId: string
  tenantName: string
  host: string
  userId: string
  password: string
  compare: (plain: string, passwordHash: string) => Promise<boolean>
}): Promise<void> {
  const account = await accountDeletionRepository().find(input.tenantId, input.userId)
  if (!account) throw new WrongPasswordError()
  const matches = await input.compare(input.password, account.passwordHash)
  if (!matches) throw new WrongPasswordError()
  await notifyAccountDeleted({
    to: account.email,
    name: input.tenantName,
    host: input.host,
    accountName: account.name,
  })
  await accountDeletionRepository().anonymize(account.id)
}
