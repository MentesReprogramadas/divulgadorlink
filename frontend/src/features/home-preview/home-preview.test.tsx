import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlassLinkCard } from './glass-link-card'
import { filterPreviewLinks, previewAvailable, previewImageUrl, previewLinks, type PreviewFilters } from './preview-data'
import { parsePreviewFavorites } from './use-preview-favorites'

const filters: PreviewFilters = { query: '', niche: 'Todos', network: '', favoritesOnly: false, order: 'recent' }
afterEach(cleanup)
describe('home mockada de catálogo', () => {
  it('combina busca sem acentos, nicho, rede, favoritos e ordenação', () => {
    expect(filterPreviewLinks({ ...filters, query: '  frequencia ' }, [])).toHaveLength(1)
    expect(filterPreviewLinks({ ...filters, niche: 'Música', network: 'whatsapp' }, [])).toEqual([])
    expect(filterPreviewLinks({ ...filters, favoritesOnly: true }, ['codigo-aberto']).map(item => item.slug)).toEqual(['codigo-aberto'])
    const sorted = filterPreviewLinks({ ...filters, order: 'views' }, [])
    expect(sorted.map(item => item.views)).toEqual([...sorted.map(item => item.views)].sort((a, b) => b - a))
  })
  it('aceita somente as fotos da allowlist e funciona somente em desenvolvimento', () => {
    expect(new URL(previewImageUrl('mountains')!).host).toBe('images.unsplash.com')
    for (const invalid of ['__proto__', 'constructor', 'https://example.com', '../mountains']) expect(previewImageUrl(invalid)).toBeNull()
    expect(previewAvailable('development')).toBe(true)
    for (const mode of ['production', 'test', undefined]) expect(previewAvailable(mode)).toBe(false)
  })
  it('recupera favoritos válidos sem confiar em dados do storage', () => {
    expect(parsePreviewFavorites('invalid')).toEqual([])
    expect(parsePreviewFavorites('{}')).toEqual([])
    expect(parsePreviewFavorites('["fora-do-roteiro",1,"invalid","fora-do-roteiro"]')).toEqual(['fora-do-roteiro'])
  })
  it('preserva patrocinado, favorito e navegação separados, com fallback de imagem', () => {
    const onFavorite = vi.fn()
    render(<GlassLinkCard link={previewLinks[0]} saved={false} onFavorite={onFavorite} featured />)
    expect(screen.getByText('Patrocinado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }))
    expect(onFavorite).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Ver detalhes de Fora do roteiro' }).getAttribute('href')).toBe('/dev/home-preview/link/fora-do-roteiro')
    fireEvent.error(screen.getByAltText(previewLinks[0].imageAlt))
    expect(screen.getByRole('img', { name: 'Imagem indisponível para Fora do roteiro' })).toBeTruthy()
  })
})
