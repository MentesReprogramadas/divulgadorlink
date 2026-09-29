import { describe, expect, it } from 'vitest'
import { anonymizeAccount } from '@/use-cases/@Auth/anonymize-account'

describe('exclusão da conta', () => {
  it('corta o uuid e conserva o fato financeiro', () => {
    const result = anonymizeAccount({
      user: { id: 'u1', name: 'Ana', email: 'a@b.com', phone: '+5511999999999' },
      identifiers: [{ id: 'i1', normalizedValue: 'a@b.com' }],
      orders: [{ id: 'o1', amountCents: 790, status: 'PAID', userId: 'u1', createdAt: new Date('2026-09-01T00:00:00.000Z') }],
      audits: [
        { id: 'a1', actorId: 'u1', entityId: 'u1', before: { email: 'a@b.com', userId: 'u1' }, after: { email: 'a@b.com', userId: 'u1', title: 'Receitas' } },
        { id: 'a2', actorId: 'admin', entityId: 'link1', before: { title: 'Receitas' } },
      ],
      links: [{ id: 'link1', status: 'PUBLISHED', ownerId: 'u1' }],
    })
    expect(result.user).toBeNull()
    expect(result.identifiers).toEqual([])
    expect(result.orders[0]).toMatchObject({ id: 'o1', amountCents: 790, status: 'PAID', userId: null })
    expect(result.orders[0].createdAt.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(result.audits[0]).toMatchObject({ actorId: null, entityId: null, before: {}, after: { title: 'Receitas' } })
    expect(result.audits[1]).toMatchObject({ actorId: 'admin', entityId: 'link1', before: { title: 'Receitas' } })
    expect(result.links[0]).toEqual({ id: 'link1', status: 'PUBLISHED', ownerId: null })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('u1')
    expect(serialized).not.toContain('a@b.com')
    expect(serialized).not.toContain('Ana')
  })
})
