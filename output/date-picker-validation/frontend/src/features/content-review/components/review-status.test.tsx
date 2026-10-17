import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ReviewStatus } from './review-status'
afterEach(cleanup)
it('mostra fila e recusa sem permitir contestar duas vezes', () => {
  const onAppeal = vi.fn(), review = { id: 'review', status: 'PENDING', version: 2, reason: null, canAppeal: false }
  const { rerender } = render(<ReviewStatus review={review} pending={false} onAppeal={onAppeal} />)
  expect(screen.getByText('Em revisão humana')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Contestar recusa' })).toBeNull()
  rerender(<ReviewStatus review={{ ...review, status: 'REJECTED', reason: 'Explique o destino.' }} pending={false} onAppeal={onAppeal} />)
  expect(screen.getByText('Explique o destino.')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Contestar recusa' })).toBeNull()
})
it('falha ao contestar preserva explicação e permite nova tentativa', async () => {
  const onAppeal = vi.fn().mockRejectedValueOnce(new Error('Sem conexão.')).mockResolvedValueOnce(undefined)
  render(<ReviewStatus review={{ id: 'review', status: 'REJECTED', version: 1, reason: 'Falta contexto', canAppeal: true }} pending={false} onAppeal={onAppeal} />)
  fireEvent.click(screen.getByRole('button', { name: 'Contestar recusa' }))
  const input = screen.getByLabelText('Por que devemos reavaliar?')
  fireEvent.change(input, { target: { value: 'Projeto de educação.' } })
  fireEvent.submit(input.closest('form')!)
  expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão.')
  expect((input as HTMLTextAreaElement).value).toBe('Projeto de educação.')
  fireEvent.submit(input.closest('form')!)
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(onAppeal).toHaveBeenLastCalledWith('Projeto de educação.')
})
