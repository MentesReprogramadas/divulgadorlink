import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LiquidLens } from './liquid-lens'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('preserva o controle e o fallback de vidro quando ResizeObserver não está disponível', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  render(<button type="button"><LiquidLens radius={12} />Salvar</button>)
  const button = screen.getByRole('button', { name: 'Salvar' })
  expect(button.querySelector('[data-optics="frosted"]')?.getAttribute('aria-hidden')).toBe('true')
  expect(button.querySelector('[tabindex]')).toBeNull()
})

it('a variante sem borda mantém vidro decorativo e o nome do controle sem a camada de rim', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  const { container, rerender } = render(<button type="button"><LiquidLens edge="none" />Menu</button>)
  expect(screen.getByRole('button', { name: 'Menu' })).toBeTruthy()
  expect(container.querySelector('[data-optics]')?.children).toHaveLength(1)
  rerender(<button type="button"><LiquidLens />Menu</button>)
  expect(container.querySelector('[data-optics]')?.children).toHaveLength(2)
})

it('mantém vidro e bordas sem criar filtros SVG ou observadores por controle', () => {
  const observe = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect() {} })
  const { container } = render(<button type="button"><LiquidLens radius={12} />Salvar</button>)
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy()
  expect(container.querySelector('[data-optics="frosted"]')).toBeTruthy()
  expect(container.querySelector('svg, canvas, filter')).toBeNull()
  expect(observe).not.toHaveBeenCalled()
})
