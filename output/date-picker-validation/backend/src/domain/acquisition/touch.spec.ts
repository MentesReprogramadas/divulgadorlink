import { describe, expect, it } from 'vitest'
import { parseTouch } from '@/domain/acquisition/touch'

const good = JSON.stringify({
  source: 'meta', medium: 'paid', campaign: 'outubro', content: 'video-1', term: 'link', landingPath: '/divulgar',
})

describe('toque de campanha', () => {
  it('aceita o primeiro toque bem formado', () => {
    expect(parseTouch(good)?.campaign).toBe('outubro')
  })

  it('rejeita caractere fora da lista e path estranho', () => {
    expect(parseTouch(JSON.stringify({ source: 'meta ads', medium: 'paid', campaign: 'a', content: '', term: '', landingPath: '/divulgar' }))).toBeNull()
    expect(parseTouch(JSON.stringify({ source: 'meta', medium: 'paid', campaign: 'a', content: '', term: '', landingPath: '/' }))).toBeNull()
  })

  it('rejeita cookie vazio', () => {
    expect(parseTouch(undefined)).toBeNull()
  })
})
