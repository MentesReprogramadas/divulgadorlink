import { describe, expect, it } from 'vitest'
import { entriesFrom } from '@/http/sitemap-index'
import type { NicheRecord, NetworkRecord, SitemapLinkRef } from '@/repositories/links-repository'

const updated = new Date('2026-10-06T00:00:00.000Z')

function niche(): NicheRecord {
  return {
    id: 'niche-jogos',
    tenantId: 't',
    name: 'Jogos',
    slug: 'jogos',
    requiresAge: false,
    isPublicFacet: true,
    summary: null,
    updatedAt: updated,
  }
}

function network(): NetworkRecord {
  return {
    id: 'net-telegram',
    tenantId: 't',
    name: 'Telegram',
    slug: 'telegram',
    isPublicFacet: true,
    summary: null,
    knownHosts: ['t.me'],
    updatedAt: updated,
  }
}

describe('lastmod da home', () => {
  it('usa a data do link indexável e omite quando não há', () => {
    const link: SitemapLinkRef = { id: 'link-1', nicheId: 'niche-jogos', updatedAt: updated }
    const withLink = entriesFrom(
      [niche()],
      [network()],
      [link],
    )
    expect(withLink[0]).toEqual({ path: '/', updatedAt: '2026-10-06T00:00:00.000Z' })
    const empty = entriesFrom([niche()], [network()], [])
    expect(empty[0]).toEqual({ path: '/', updatedAt: '' })
    expect(empty[0]?.updatedAt).not.toBe(new Date().toISOString())
  })

  it('inclui facetas públicas mesmo sem links e exclui facetas privadas e 18+', () => {
    const entries = entriesFrom(
      [niche(), { ...niche(), id: 'adult', slug: 'adulto', requiresAge: true }, { ...niche(), id: 'private', slug: 'privado', isPublicFacet: false }],
      [network(), { ...network(), id: 'private-network', slug: 'privada', isPublicFacet: false }],
      [{ id: 'hidden', nicheId: 'adult', updatedAt: updated }],
    )
    expect(entries.map((entry) => entry.path)).toEqual(['/', '/privacidade', '/termos', '/nicho/jogos', '/rede/telegram'])
  })
})
