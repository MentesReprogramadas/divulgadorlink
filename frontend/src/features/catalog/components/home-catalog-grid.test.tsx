import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomeCatalogGrid } from './home-catalog-grid'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('recalcula alturas sem reordenar os cards e observa lotes novos', () => {
  let height = 281
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height: height * 2 }) as DOMRect)
  const observe = vi.fn(), disconnect = vi.fn()
  let resize: ResizeObserverCallback
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = callback }
    observe = observe
    disconnect = disconnect
  })
  const first = <a key="first" href="/link/first">Primeiro</a>
  const view = render(<HomeCatalogGrid>{first}</HomeCatalogGrid>)
  const item = screen.getByRole('link', { name: 'Primeiro' }).parentElement!
  expect(item.style.gridRowEnd).toBe('span 281')
  expect(observe).toHaveBeenCalledWith(item)
  height = 181
  resize!([{ target: item }] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
  expect(item.style.gridRowEnd).toBe('span 181')
  view.rerender(<HomeCatalogGrid>{[first, <a key="next" href="/link/next">Próximo</a>]}</HomeCatalogGrid>)
  expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(['Primeiro', 'Próximo'])
  expect(observe).toHaveBeenCalledWith(screen.getByRole('link', { name: 'Próximo' }).parentElement)
  expect(disconnect).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(disconnect).toHaveBeenCalledTimes(2)
})

it('preserva os links no grid comum quando ResizeObserver não está disponível', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  render(<HomeCatalogGrid><a href="/link/first">Primeiro</a></HomeCatalogGrid>)
  const link = screen.getByRole('link', { name: 'Primeiro' })
  expect(link.getAttribute('href')).toBe('/link/first')
  expect(link.parentElement?.parentElement?.hasAttribute('data-packed')).toBe(false)
})
