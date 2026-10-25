import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CopyLinkButton } from './copy-link-button'

vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => <span aria-hidden="true" /> }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })

it('copia o endereço público sem propagar token de superfície nem referência de busca', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  window.history.replaceState({}, '', '/link/one?surfaceToken=private.signed&queryId=search-reference')
  render(<CopyLinkButton path="/link/one" />)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
  expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Link copiado.')
  expect(writeText).toHaveBeenCalledWith(new URL('/link/one', window.location.origin).href)
})

it('usa canonical informado e anuncia falha recuperável quando o navegador recusa a cópia', async () => {
  const writeText = vi.fn().mockRejectedValueOnce(new Error('permission')).mockResolvedValueOnce(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<CopyLinkButton path="https://catalogo.test/link/one" />)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível copiar')
  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
  expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Link copiado.')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(writeText).toHaveBeenLastCalledWith('https://catalogo.test/link/one')
})
