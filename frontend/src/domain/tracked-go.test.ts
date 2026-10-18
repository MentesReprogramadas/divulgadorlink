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

it('F08 preserves an opaque search reference through the validated exit but never injects arbitrary query strings', () => {
  const id = '00000000-0000-4000-8000-000000000001'
  expect(trackedGoPath('aula', 'search.token', undefined, id)).toBe('/go/aula?surfaceToken=search.token&queryId=' + id)
  expect(trackedGoPath('aula', 'search.token', undefined, 'x&redirect=https://bad.test')).toBe('/go/aula?surfaceToken=search.token')
  expect(trackedGoPath('aula', undefined, undefined, id)).toBe('/go/aula')
})
