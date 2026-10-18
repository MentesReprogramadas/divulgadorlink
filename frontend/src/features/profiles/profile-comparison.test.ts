import { expect, it } from 'vitest'
import { emptyProfile } from './profile-contract'
import { profileComparison } from './profile-comparison'
it('F19 comparison uses semantic fields and identifies replacement of one photo by another', () => {
  const first = { ...emptyProfile(), slug: 'pagina', name: 'Ana', avatarAssetId: 'a'.repeat(64) }
  const rows = profileComparison(first, { ...first, name: 'Ana Silva', avatarAssetId: 'b'.repeat(64) })
  expect(rows.find(row => row.label === 'Nome da página')).toMatchObject({ changed: true, historical: 'Ana', current: 'Ana Silva' })
  expect(rows.find(row => row.label === 'Foto')?.changed).toBe(true)
  expect(rows.some(row => row.label.includes('ownerId'))).toBe(false)
  expect(profileComparison(first, first).every(row => !row.changed)).toBe(true)
})
