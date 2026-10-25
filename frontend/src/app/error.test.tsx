import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PageError from './error'

afterEach(cleanup)
it('oferece recuperação sem revelar detalhes internos da falha', () => {
  const reset = vi.fn()
  render(<PageError error={new Error('internal-secret')} reset={reset} />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Não foi possível abrir esta página')
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText(/internal-secret/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
  expect(reset).toHaveBeenCalledOnce()
})
