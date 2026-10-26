import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { HomeSkeleton } from './catalog-skeleton'
import { HomeHeroCopy } from './home-hero-copy'

afterEach(cleanup)

it('mantém título e descrição do hero durante e após o carregamento', () => {
  const ready = render(<HomeHeroCopy />)
  const heading = screen.getByRole('heading', { level: 1 }).textContent
  const description = ready.container.querySelector('p')?.textContent
  ready.unmount()
  const loading = render(<HomeSkeleton />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(heading)
  expect(loading.container.querySelector('p')?.textContent).toBe(description)
  expect(screen.getByRole('heading', { name: 'Catálogo de links' })).toBeTruthy()
  expect(screen.getByRole('status', { name: 'Carregando links' })).toBeTruthy()
  expect(screen.queryByText('próximo link.')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
})
