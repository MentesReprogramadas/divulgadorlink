import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ProfileError from '@/app/p/[slug]/error'
afterEach(cleanup)
it('F09-C01 falha pública oferece retry sem exibir erro técnico ou dados do perfil', () => {
  const reset = vi.fn(); render(<ProfileError reset={reset} />)
  expect(screen.getByRole('heading', { name: 'Perfil indisponível no momento' })).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar.')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' })); expect(reset).toHaveBeenCalledTimes(1)
})
