import { describe, expect, it } from 'vitest'
import { hostMatchesNetwork } from '@/domain/links/network-host'

describe('host da rede', () => {
  it('aceita o host e o subdomínio', () => {
    expect(hostMatchesNetwork('instagram.com', ['instagram.com'])).toBe(true)
    expect(hostMatchesNetwork('www.instagram.com', ['instagram.com'])).toBe(true)
  })

  it('recusa outro host e aceita rede sem lista', () => {
    expect(hostMatchesNetwork('instagram.com', ['t.me', 'telegram.me'])).toBe(false)
    expect(hostMatchesNetwork('exemplo.com', [])).toBe(true)
  })
})
