import { describe, expect, it } from 'vitest'
import { replaceUserIdentifier, type IdentifierClient } from '@/use-cases/@Auth/register'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'

describe('replaceUserIdentifier', () => {
  it('colisão no unique do tenant vira erro de domínio', async () => {
    const prisma: IdentifierClient = {
      async $transaction(fn) {
        return fn({
          userIdentifier: {
            async findFirst({ where }) {
              if (where.userId) {
                return { id: 'current', normalizedValue: 'old@x.com' }
              }
              return { id: 'taken', normalizedValue: 'taken@x.com' }
            },
            async update() {
              throw new Error('não deveria atualizar na colisão')
            },
            async create() {
              throw new Error('não deveria criar na colisão')
            },
          },
        })
      },
    }

    await expect(
      replaceUserIdentifier({
        prisma,
        userId: 'user-1',
        tenantId: 'tenant-1',
        kind: 'EMAIL',
        normalizedValue: 'taken@x.com',
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError)
  })
})
