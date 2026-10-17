import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { emptyProfile, type ProfileContent } from '../profile-contract'
import { ProfileGroupManager } from './profile-group-manager'
import { chooseSelect } from '@/test-select'

afterEach(cleanup)
function editor(content: ProfileContent) {
  const changed = vi.fn()
  function Harness() {
    const [value, setValue] = useState(content)
    return <ProfileGroupManager content={value} catalog={[]} onChange={next => { changed(next); setValue(next) }} />
  }
  render(<Harness />)
  return changed
}
it('canceling creation leaves no empty group; completing opens only the new group', () => {
  const changed = editor(emptyProfile())
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar grupo' }))
  fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Meus projetos' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar grupo' }))
  fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Leituras' } })
  fireEvent.click(screen.getByRole('button', { name: 'Concluir grupo' }))
  expect(changed.mock.calls[0][0].categories).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Leituras' })).toBe(document.activeElement)
  expect(screen.getByText('Adicione o primeiro link')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar link' }))
  fireEvent.change(screen.getByLabelText('Título do link'), { target: { value: 'Rascunho cancelado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).toHaveBeenCalledTimes(1)
})
it('requires confirmation to remove a group and clears its primary link without changing another group', () => {
  const content = { ...emptyProfile(), primaryItemId: 'one', categories: [{ id: 'a', name: 'A', visible: true }, { id: 'b', name: 'B', visible: true }], items: [{ id: 'one', categoryId: 'a', type: 'URL' as const, label: 'One', destination: 'https://example.com', visible: true }] }
  const changed = editor(content)
  fireEvent.click(screen.getByRole('button', { name: 'A Abrir grupo' }))
  if (!screen.getByText('Opções do grupo').parentElement?.hasAttribute('open')) fireEvent.click(screen.getByText('Opções do grupo'))
  fireEvent.click(screen.getByRole('button', { name: 'Remover grupo' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  if (!screen.getByText('Opções do grupo').parentElement?.hasAttribute('open')) fireEvent.click(screen.getByText('Opções do grupo'))
  fireEvent.click(screen.getByRole('button', { name: 'Remover grupo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))
  expect(changed.mock.calls[0][0]).toMatchObject({ categories: [{ id: 'b', name: 'B', visible: true }], items: [], primaryItemId: null })
})

it('choosing the main button uses a modal and only applies when confirmed', async () => {
  const changed = editor({ ...emptyProfile(), categories: [{ id: 'a', name: 'A', visible: true }], items: [{ id: 'one', categoryId: 'a', type: 'URL', label: 'Meu site', destination: 'https://example.com', visible: true }] })
  expect(screen.queryByLabelText('Botão principal')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Botão principal' }))
  await chooseSelect(screen.getByLabelText('Botão principal'), 'one')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Botão principal' }))
  await chooseSelect(screen.getByLabelText('Botão principal'), 'one')
  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
  expect(changed.mock.calls[0][0].primaryItemId).toBe('one')
  expect(screen.queryByRole('dialog', { name: 'Escolher botão principal' })).toBeNull()
})
