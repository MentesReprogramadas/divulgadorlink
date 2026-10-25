import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WaveHome } from './wave-home'

vi.mock('./wave-frame', () => ({ WaveFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
afterEach(cleanup)

it('inclui os títulos visíveis das coleções no nome de cada botão', () => {
  render(<WaveHome />)
  for (const title of ['Um novo horizonte.', 'A sua próxima descoberta.', 'Boas ideias à mesa.']) {
    expect(screen.getByRole('button', { name: new RegExp(title) }).textContent).toContain(title)
  }
})
