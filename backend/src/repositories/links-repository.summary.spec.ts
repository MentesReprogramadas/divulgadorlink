import { describe, expect, it } from 'vitest'
import { InMemoryLinksRepository, resetLinksRepositoryForTest, getLinksRepository } from '@/repositories/links-repository'

describe('resumo e contagem da faceta', () => {
  it('conta só link substantivo e ignora 18+, banido e texto curto', async () => {
    resetLinksRepositoryForTest()
    const repo = getLinksRepository() as InMemoryLinksRepository
    const fat = 'b'.repeat(80)
    repo.addUser({ id: 'ana', tenantId: 'seed-temlinkaqui', status: 'ACTIVE', identifiers: [] })
    repo.addUser({ id: 'ban', tenantId: 'seed-temlinkaqui', status: 'BANNED', identifiers: [] })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Um', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Dois', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Curto', description: 'x', nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ban', status: 'PUBLISHED', name: 'Ban', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram' })
    repo.addLink({ tenantId: 'seed-temlinkaqui', ownerId: 'ana', status: 'PUBLISHED', name: 'Adulto', description: fat, nicheId: 'niche-apostas', networkId: 'net-telegram' })
    const counts = await repo.substantiveCounts('seed-temlinkaqui')
    expect(counts.niches).toEqual([{ id: 'niche-jogos', count: 2 }])
    expect(counts.networks).toEqual([{ id: 'net-telegram', count: 2 }])
  })

  it('grava resumo e string vazia não é chamada com espaço', async () => {
    resetLinksRepositoryForTest()
    const repo = getLinksRepository() as InMemoryLinksRepository
    const saved = await repo.updateFacetSummary({
      kind: 'niche', id: 'niche-jogos', tenantId: 'seed-temlinkaqui', summary: 'texto único',
    })
    expect(saved).toMatchObject({ summary: 'texto único' })
    const cleared = await repo.updateFacetSummary({
      kind: 'niche', id: 'niche-jogos', tenantId: 'seed-temlinkaqui', summary: null,
    })
    expect(cleared).toMatchObject({ summary: null })
    expect(await repo.updateFacetSummary({
      kind: 'niche', id: 'niche-jogos', tenantId: 'tenant-b', summary: 'x',
    })).toBeNull()
  })
})
