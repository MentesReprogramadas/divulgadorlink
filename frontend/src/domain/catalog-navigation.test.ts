import { describe, expect, it } from 'vitest'
import { catalogQueryRecord } from './catalog-navigation'

describe('query pública do catálogo', () => {
  it('preserva o cursor e duplicatas para validação no servidor, sem propagar tracking', () => {
    const query = catalogQueryRecord({languageTag:'pt',cursor:['one','two'],surfaceToken:'private',utm_source:'campaign'})
    expect(query.getAll('cursor')).toEqual(['one','two'])
    expect(query.get('languageTag')).toBe('pt')
    expect(query.has('surfaceToken')).toBe(false)
    expect(query.has('utm_source')).toBe(false)
  })
})
