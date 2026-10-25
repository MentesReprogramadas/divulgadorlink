import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { InvalidDiscovery } from './invalid-discovery'

afterEach(cleanup)

it('oferece título de página, feedback em vidro e saída para os filtros inválidos', () => {
  const view = render(<InvalidDiscovery href="/nicho/jogos?rede=site" />)
  expect(screen.getByRole('heading', { level: 1, name: 'Revise os filtros' })).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toContain('Não foi possível usar estes filtros')
  expect(screen.getByRole('link', { name: 'Limpar filtros' }).getAttribute('href')).toBe('/nicho/jogos?rede=site')
  expect(view.container.querySelector('[data-optics]')).toBeTruthy()
})

it('permite um subtítulo quando a busca já fornece o título principal', () => {
  render(<><h1>Buscar</h1><InvalidDiscovery href="/busca?q=arte" headingLevel={2} /></>)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 2, name: 'Revise os filtros' })).toBeTruthy()
})
