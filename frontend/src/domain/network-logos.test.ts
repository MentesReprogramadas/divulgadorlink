import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { networkLogo } from './network-logos'

describe('assets de redes', () => {
  it('tem arquivos locais com origem registrada para as 19 marcas', () => {
    const sources = JSON.parse(readFileSync(resolve('public/networks/sources.json'), 'utf8')) as Array<{ slug: string; source: string }>
    expect(sources).toHaveLength(19)
    for (const entry of sources) {
      const logo = networkLogo(entry.slug)
      expect(logo).toBe(`/networks/${entry.slug}.svg`)
      const svg = readFileSync(resolve('public', logo!.slice(1)), 'utf8')
      expect(svg).toContain('<svg')
      expect(svg).not.toMatch(/<script|<foreignObject|(?:href|src)="https?:/i)
      expect(entry.source).toMatch(/^https:\/\//)
    }
  })

  it('não inventa um logo para redes genéricas ou desconhecidas', () => {
    for (const slug of ['site', 'outro', 'desconhecida', 'toString', '__proto__']) expect(networkLogo(slug)).toBeNull()
  })

  it('preserva os vazados de Kwai e Privacy em máscaras monocromáticas', () => {
    for (const slug of ['kwai', 'privacy']) {
      const svg = readFileSync(resolve('public', networkLogo(slug)!.slice(1)), 'utf8')
      expect(svg).toContain('<path')
      expect(svg).toContain('fill-rule="evenodd"')
      expect(svg).not.toMatch(/<image|data:image|<rect|<filter/i)
    }
  })
})
