import { describe, expect, it } from 'vitest'
import { retainedProfileRevisions, restoreProfileContent } from './profile-history'
const now = new Date('2026-10-17T12:00:00Z')
describe('F19 retention and restoration boundary', () => {
  it('F19-T03 keeps at most 50, protecting an expired active publication', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({ id: String(index), version: index, createdAt: now }))
    rows[0].createdAt = new Date('2025-01-01')
    const kept = retainedProfileRevisions(rows, 0, now)
    expect(kept).toHaveLength(50); expect(kept).toContain('0'); expect(kept).toContain('59'); expect(kept).not.toContain('10')
  })
  it('F19-T03 expires old snapshots, preserves the exact boundary and never invents a publication', () => {
    const cutoff = new Date(now.getTime() - 180 * 86400000)
    expect(retainedProfileRevisions([{ id: 'expired', version: 1, createdAt: new Date(cutoff.getTime() - 1) }, { id: 'edge', version: 2, createdAt: cutoff }], null, now)).toEqual(['edge'])
  })
  it('F19-U01/U04 restores only authoring content and preserves current identity', () => {
    const content = { slug: 'old-address', name: 'Title', bio: '', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [], items: [] }
    expect(restoreProfileContent(content, 'current-address')).toEqual({ ...content, slug: 'current-address' })
    for (const field of ['role', 'ownerId', 'tenantId', 'subscription', 'publication']) expect(() => restoreProfileContent({ ...content, [field]: 'sentinel' }, 'current-address')).toThrow()
    expect(content.slug).toBe('old-address')
  })
})
