import { expect, it } from 'vitest'
import { emptyProfile } from './profile-contract'
import { reorderProfileItems, transferProfileLink } from './profile-organization'

it('inserts a dragged item without swapping or mutating other positions', () => {
  const items = ['a', 'b', 'c', 'd'].map(id => ({ id }))
  expect(reorderProfileItems(items, 'a', 'd').map(row => row.id)).toEqual(['b', 'c', 'd', 'a'])
  expect(reorderProfileItems(items, 'd', 'b').map(row => row.id)).toEqual(['a', 'd', 'b', 'c'])
  expect(items.map(row => row.id)).toEqual(['a', 'b', 'c', 'd'])
  expect(reorderProfileItems(items, 'missing', 'a')).toEqual(items)
})
it('transfers only the selected link, retaining its primary identity, type, visibility and destination', () => {
  const content = { ...emptyProfile(), primaryItemId: 'one', categories: [{ id: 'a', name: 'A', visible: true }, { id: 'b', name: 'B', visible: false }], items: [{ id: 'one', categoryId: 'a', label: 'One', type: 'CATALOG' as const, destination: 'catalog-id', visible: false }, { id: 'two', categoryId: 'b', label: 'Two', type: 'URL' as const, destination: 'https://example.com', visible: true }] }
  const moved = transferProfileLink(content, 'one', 'b')
  expect(moved.items.map(item => item.id)).toEqual(['two', 'one'])
  expect(moved.items[1]).toEqual({ ...content.items[0], categoryId: 'b' })
  expect(moved.primaryItemId).toBe('one'); expect(content.items[0].categoryId).toBe('a')
  expect(transferProfileLink(content, 'one', 'missing')).toBe(content)
})
