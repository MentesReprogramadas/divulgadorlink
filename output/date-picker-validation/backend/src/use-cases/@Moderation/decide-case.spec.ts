import { describe, expect, it } from 'vitest'
import { decideCase } from '@/use-cases/@Moderation/decide-case'

describe('decisão', () => {
  it('não troca a URL e exige idade explícita ao criar nicho', () => {
    const result = decideCase({
      decision: 'APPROVE',
      url: 'https://t.me/canal',
      nextUrl: 'https://t.me/outro',
      requiresAge: true,
      creatingNiche: true,
    })
    expect(result.url).toBe('https://t.me/canal')
    expect(result.status).toBe('PUBLISHED')
    expect(result.requiresAge).toBe(true)
    expect(result.occupiesSlot).toBe(true)
  })

  it('recusa criar nicho de golpe', () => {
    expect(() => decideCase({
      decision: 'APPROVE',
      url: 'https://t.me/canal',
      creatingNiche: true,
      nicheKind: 'SCAM',
      requiresAge: false,
      wasPublished: false,
    })).toThrow(/nicho/)
  })

  it('recusa final de link nunca publicado libera a vaga', () => {
    expect(decideCase({
      decision: 'REJECT',
      url: 'https://t.me/canal',
      wasPublished: false,
    }).occupiesSlot).toBe(false)
  })
})
