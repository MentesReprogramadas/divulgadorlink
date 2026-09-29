import { describe, expect, it } from 'vitest'
import { canonicalUrl } from '@/domain/links/canonical-url'

describe('pré-recusa', () => {
  it('não trata outro caminho do mesmo host como o link banido', () => {
    expect(canonicalUrl('https://t.me/exemplo123/')).not.toBe(canonicalUrl('https://t.me/outrocanal'))
  })
})
