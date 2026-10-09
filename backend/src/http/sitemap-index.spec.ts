import { describe, expect, it } from 'vitest'
import { entriesFrom } from '@/http/sitemap-index'
import type { NicheRecord, NetworkRecord, SitemapLinkRef } from '@/repositories/links-repository'

const updated = new Date('2026-10-06T00:00:00.000Z')

function niche(countReady = false): NicheRecord {
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
      { niches: [{ id: 'niche-jogos', count: 3 }], networks: [{ id: 'net-telegram', count: 3 }] },
      [link],
    )
    expect(withLink[0]).toEqual({ path: '/', updatedAt: '2026-10-06T00:00:00.000Z' })
    const empty = entriesFrom([niche()], [network()], { niches: [], networks: [] }, [])
    expect(empty[0]).toEqual({ path: '/', updatedAt: '' })
    expect(empty[0]?.updatedAt).not.toBe(new Date().toISOString())
  })
})
