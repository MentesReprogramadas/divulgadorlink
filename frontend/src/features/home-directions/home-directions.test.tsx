import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { directionHref, directionIds, findHomeDirection, homeDirections } from './directions'
import { HomeDirectionGallery } from './home-direction-gallery'
import { WaveCanvas } from './direction-backdrop'
import { DirectionHome } from './direction-home'
import { previewLinks } from '@/features/home-preview/preview-data'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('direções da home', () => {
  it('resolve somente estilos conhecidos e mantém todos navegáveis', () => {
    expect(new Set(homeDirections.map(item => item.id)).size).toBe(32)
    for (const id of directionIds) expect(directionHref(findHomeDirection(id)!.id)).toBe(`/dev/homes/${id}`)
    for (const invalid of ['__proto__', 'constructor', '../aurora', 'https://example.com']) expect(findHomeDirection(invalid)).toBeUndefined()
  })
  it('oferece acesso às 32 homes e à direção anterior', () => {
    render(<HomeDirectionGallery />)
    const calls = screen.getAllByRole('link', { name: /Explorar esta direção/ })
    for (const direction of homeDirections) {
      const link = screen.getByRole('heading', { name: direction.name }).closest('a')
      expect(calls).toContain(link)
      expect(link?.getAttribute('href')).toBe(directionHref(direction.id))
    }
    expect(screen.getAllByRole('link')).toHaveLength(33)
  })
  it('filtra famílias sem perder a navegação para cada direção', () => {
    render(<HomeDirectionGallery />)
    const family = homeDirections[0].family
    fireEvent.click(screen.getByRole('button', { name: family }))
    expect(screen.getAllByRole('link', { name: /Explorar esta direção/ })).toHaveLength(homeDirections.filter(item => item.family === family).length)
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))
    expect(screen.getAllByRole('link', { name: /Explorar esta direção/ })).toHaveLength(homeDirections.length)
  })
  it('mantém Conhecer no nome acessível de cada chamada dos cards', () => {
    render(<DirectionHome direction={homeDirections[0]} />)
    for (const link of previewLinks) expect(screen.getByRole('link', { name: `Conhecer ${link.title}` }).textContent).toContain('Conhecer')
  })
  it('preserva alternativa visual quando WebGL não está disponível', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const view = render(<WaveCanvas paused={false} />)
    expect(view.container.querySelector('canvas')?.getAttribute('data-renderer')).toBeNull()
    expect(context).toHaveBeenCalledOnce()
    view.unmount()
    context.mockImplementation(() => { throw new Error('GPU indisponível') })
    expect(() => render(<WaveCanvas paused={false} />)).not.toThrow()
  })
})
