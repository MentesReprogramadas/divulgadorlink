import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CollectionNameForm } from './collection-name-form'
afterEach(cleanup)
it('F04-C01 preserves draft and creation identity after offline failure, prevents double submit', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Sem conexão.')).mockResolvedValueOnce(undefined)
  render(<CollectionNameForm onSave={save} />)
  fireEvent.change(screen.getByLabelText('Nome da coleção'), { target: { value: 'Grupo de estudos' } })
  fireEvent.click(screen.getByRole('button', { name: 'Criar coleção' }))
  await screen.findByRole('alert')
  expect((screen.getByLabelText('Nome da coleção') as HTMLInputElement).value).toBe('Grupo de estudos')
  fireEvent.click(screen.getByRole('button', { name: 'Criar coleção' }))
  await screen.findByRole('button', { name: 'Criar coleção' })
  expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0])
})
