import { expect, it } from 'vitest'
import { moveProfileItem } from './profile-order'
it('F09-U02 grupos e links mudam de posição sem perder, incluir ou repetir IDs', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  expect(moveProfileItem(items, 0, 2).map(i => i.id)).toEqual(['c', 'b', 'a'])
  expect(items.map(i => i.id)).toEqual(['a', 'b', 'c'])
  expect(moveProfileItem(items, 0, 0)).toEqual(items)
})
it.each([[-1, 0], [0, 2], [0.5, 0], [0, -1]])('F09-U02 rejeita posição inválida %j', (from, to) => { expect(() => moveProfileItem([{ id: 'a' }, { id: 'b' }], from, to)).toThrow() })
it('F09-U02 rejeita entrada duplicada em vez de perder um item na ordenação', () => { expect(() => moveProfileItem([{ id: 'a' }, { id: 'a' }], 0, 1)).toThrow() })
