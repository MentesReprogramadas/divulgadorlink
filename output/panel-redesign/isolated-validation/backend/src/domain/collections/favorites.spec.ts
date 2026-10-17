import { expect, it } from 'vitest'
import { favoriteView, collectionName } from './favorites'
it('F04-U03/T04 unavailable item never exposes name or navigation', () => {
  expect(favoriteView({ id: 'f', linkId: 'l', visible: false, name: 'PRIVATE', description: 'SECRET' })).toEqual({ id: 'f', linkId: 'l', available: false })
})
it('F04-U04 collection names trim whitespace and reject empty/overlong/control text', () => {
  expect(collectionName('  Estudos   juntos ')).toBe('Estudos juntos')
  for (const value of ['', ' ', 'x'.repeat(81), 'a\u0000b']) expect(() => collectionName(value)).toThrow()
})
