import { hash } from 'bcryptjs'
import { Prisma, type PrismaClient, type User } from '@prisma/client'
import { z } from 'zod'
import { normalizeEmail, normalizePhone } from '@/use-cases/@Auth/confirm-identifier'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'

export const registerBodySchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(8),
    password: z.string().min(8),
  })
  .strict()

export type RegisterBody = z.infer<typeof registerBodySchema>

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export class RegisterUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: RegisterBody & { tenantId: string }): Promise<User> {
    const normalizedEmail = normalizeEmail(input.email)
    const normalizedPhone = normalizePhone(input.phone)

    const conflict = await this.prisma.userIdentifier.findFirst({
      where: {
        tenantId: input.tenantId,
        OR: [
          { kind: 'EMAIL', normalizedValue: normalizedEmail },
          { kind: 'PHONE', normalizedValue: normalizedPhone },
        ],
      },
    })

    if (conflict) {
      throw new UserAlreadyExistsError()
    }

    const passwordHash = await hash(input.password, 12)

    try {
      return await this.prisma.user.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          passwordHash,
          role: 'USER',
          identifiers: {
            create: [
              {
                tenantId: input.tenantId,
                kind: 'EMAIL',
                normalizedValue: normalizedEmail,
              },
              {
                tenantId: input.tenantId,
                kind: 'PHONE',
                normalizedValue: normalizedPhone,
              },
            ],
          },
        },
      })
    } catch (error) {
      if (isUniqueConstraint(error)) {
        throw new UserAlreadyExistsError()
      }
      throw error
    }
  }
}

export async function replaceUserIdentifier(input: {
  prisma: PrismaClient
  userId: string
  tenantId: string
  kind: 'EMAIL' | 'PHONE'
  normalizedValue: string
  now?: Date
}): Promise<void> {
  const now = input.now ?? new Date()

  try {
    await input.prisma.$transaction(async (tx) => {
      const current = await tx.userIdentifier.findFirst({
        where: {
          userId: input.userId,
          tenantId: input.tenantId,
          kind: input.kind,
          replacedAt: null,
        },
      })

      if (current?.normalizedValue === input.normalizedValue) {
        return
      }

      const collision = await tx.userIdentifier.findFirst({
        where: {
          tenantId: input.tenantId,
          kind: input.kind,
          normalizedValue: input.normalizedValue,
        },
      })

      if (collision) {
        throw new UserAlreadyExistsError()
      }

      if (current) {
        await tx.userIdentifier.update({
          where: { id: current.id },
          data: { replacedAt: now },
        })
      }

      await tx.userIdentifier.create({
        data: {
          userId: input.userId,
          tenantId: input.tenantId,
          kind: input.kind,
          normalizedValue: input.normalizedValue,
          confirmedAt: null,
        },
      })
    })
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      throw error
    }
    if (isUniqueConstraint(error)) {
      throw new UserAlreadyExistsError()
    }
    throw error
  }
}
