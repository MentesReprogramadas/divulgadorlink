import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nicheIcon } from './niche-icons'

describe('ícones semânticos de nicho', () => {
  it('mantém os 26 ícones locais, preenchidos e com fonte/licença registradas', () => {
    const sources = JSON.parse(readFileSync(resolve('public/niches/sources.json'), 'utf8')) as Array<{ slug: string; source: string; license: string }>
    expect(sources).toHaveLength(26)
    for (const entry of sources) {
      const icon = nicheIcon(entry.slug)
      const svg = readFileSync(resolve('public', icon!.slice(1)), 'utf8')
      expect(svg).toContain('<svg')
      expect(svg).toMatch(/fill="#[A-Fa-f0-9]+"/)
      expect(svg).not.toMatch(/<script|<foreignObject|(?:href|src)="https?:/i)
      expect(entry.source).toMatch(/^https:\/\/raw\.githubusercontent\.com\//)
      expect(['MIT', 'Apache-2.0']).toContain(entry.license)
    }
  })

  it('não inventa um símbolo para um conceito desconhecido', () => {
    expect(nicheIcon('desconhecido')).toBeNull()
    expect(nicheIcon('__proto__')).toBeNull()
  })
})
