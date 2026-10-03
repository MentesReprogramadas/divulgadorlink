import { describe, expect, it } from 'vitest'
import { trackedGoPath } from './tracked-go'

describe('trackedGoPath', () => {
  it('o token de chegada vence o token orgânico da página', () => {
    expect(trackedGoPath('receitas', 'home.abc', 'organic.xyz')).toBe('/go/receitas?surfaceToken=home.abc')
  })

  it('sem chegada usa o token da página', () => {
    expect(trackedGoPath('receitas', '', 'organic.xyz')).toBe('/go/receitas?surfaceToken=organic.xyz')
  })

  it('sem token não inventa superfície', () => {
    expect(trackedGoPath('receitas', '  ', undefined)).toBe('/go/receitas')
  })
})
