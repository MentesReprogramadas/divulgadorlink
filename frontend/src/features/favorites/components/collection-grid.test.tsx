import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CollectionGrid } from './collection-grid'

afterEach(cleanup)

it('inclui todo o texto visível no nome do botão sem perder a abertura da coleção', () => {
  const collection = { id: 'study', name: 'Estudos', version: 7 }, onOpen = vi.fn()
  render(<CollectionGrid collections={[collection]} pending={false} onOpen={onOpen} />)
  fireEvent.click(screen.getByRole('button', { name: 'Estudos Abrir coleção' }))
  expect(onOpen).toHaveBeenCalledExactlyOnceWith(collection)
})
