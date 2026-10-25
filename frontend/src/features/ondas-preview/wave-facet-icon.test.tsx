import { describe, expect, it } from 'vitest'
import { previewLinks, previewNiches } from '@/features/home-preview/preview-data'
import { waveFacetPaths } from './wave-facet-icon'

describe('ícones das facetas Ondas', () => {
  it('cobre todos os assuntos e tipos da demonstração sem repetir desenhos entre significados', () => {
    const labels = [...previewNiches, ...new Set(previewLinks.map(link => link.category))]
    const paths = labels.map(label => waveFacetPaths[label])
    expect(paths.every(Boolean)).toBe(true)
    expect(new Set(paths).size).toBe(labels.length)
  })
})
