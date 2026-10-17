import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readOutbound, resetOutboundForTest } from '@/adapters/notifications/outbound-mail'
import {
  deleteAccount,
  resetAccountDeletionForTest,
  testAccountDeletion,
  WrongPasswordError,
} from '@/use-cases/@Auth/delete-account'

describe('exclusão da conta', () => {
  beforeEach(() => {
    resetAccountDeletionForTest()
    resetOutboundForTest()
    process.env.EMAIL_OUTBOX = '1'
    testAccountDeletion().users.set('ana', {
      id: 'ana',
      tenantId: 'tenant',
      name: 'Ana',
      passwordHash: 'secreta',
      email: 'ana@example.com',
      wiped: false,
    })
  })

  afterEach(() => {
    delete process.env.EMAIL_OUTBOX
    resetOutboundForTest()
  })

  it('avisa e apaga o e-mail', async () => {
    await deleteAccount({
      tenantId: 'tenant',
      tenantName: 'Tem Link Aqui',
      host: 'temlinkaqui.com',
      userId: 'ana',
      password: 'secreta',
      compare: async (plain, hash) => plain === hash,
    })

    expect(testAccountDeletion().users.get('ana')).toMatchObject({ name: 'Conta excluída', email: null, wiped: true })
    expect(readOutbound('ana@example.com')[0]).toMatchObject({ kind: 'account_deleted' })
    expect(readOutbound('ana@example.com')[0]?.text).toContain('Ana')
  })

  it('senha errada não envia e não apaga', async () => {
    await expect(deleteAccount({
      tenantId: 'tenant',
      tenantName: 'Tem Link Aqui',
      host: 'temlinkaqui.com',
      userId: 'ana',
      password: 'errada',
      compare: async () => false,
    })).rejects.toBeInstanceOf(WrongPasswordError)
    expect(testAccountDeletion().users.get('ana')?.email).toBe('ana@example.com')
    expect(readOutbound('ana@example.com')).toEqual([])
  })
})
