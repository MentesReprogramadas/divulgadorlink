import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileEditor } from './profile-editor'
import { emptyProfile } from './profile-contract'
const { request, catalog } = vi.hoisted(() => ({ request: vi.fn(), catalog: vi.fn() }))
vi.mock('./profile-api', () => ({ profileRequest: request, profileCatalog: catalog }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks() })
it('F09-C01 vazio, falha recuperável e envio duplicado mantêm rascunho e só confirmam após persistência', async () => {
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ draft: null, publishedVersion: null })
  render(<ProfileEditor />); await screen.findByLabelText('Nome público')
  expect(screen.getByText('Crie um grupo para organizar seus links e redes sociais.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Nome público'), { target: { value: 'Ana' } }); fireEvent.change(screen.getByLabelText('Endereço do perfil'), { target: { value: 'ana-estudos' } })
  request.mockRejectedValueOnce(new Error('Sem conexão.'))
  fireEvent.submit(screen.getByRole('form', { name: 'Editar perfil' })); await screen.findByRole('alert')
  expect((screen.getByLabelText('Nome público') as HTMLInputElement).value).toBe('Ana')
  let finish: (value: unknown) => void = () => {}
  request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const form = screen.getByRole('form', { name: 'Editar perfil' }); fireEvent.submit(form); fireEvent.submit(form)
  expect(request).toHaveBeenCalledTimes(3); expect(screen.queryByText(/Rascunho salvo/)).toBeNull()
  finish({ draft: { ...emptyProfile(), slug: 'ana-estudos', name: 'Ana', version: 1 }, publishedVersion: null })
  await waitFor(() => expect(screen.getByText('Rascunho salvo. Publique para atualizar sua página.')).toBeTruthy())
  expect(JSON.parse(request.mock.calls[1][1].body)).toEqual(JSON.parse(request.mock.calls[2][1].body))
})
it('F09-C01 falha ao carregar oferece recuperação sem editor nem sucesso falso', async () => {
  request.mockRejectedValueOnce(new Error('Não foi possível carregar.')); catalog.mockResolvedValue([])
  render(<ProfileEditor />); await screen.findByRole('alert'); expect(screen.queryByLabelText('Nome público')).toBeNull()
  request.mockResolvedValueOnce({ draft: null, publishedVersion: null }); fireEvent.click(screen.getByRole('button', { name: 'Atualizar dados' })); await screen.findByLabelText('Nome público')
})
it('F09-C01 confirmação recebe foco somente após o texto ser renderizado', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0 })
  const texts: string[] = [], focus = HTMLElement.prototype.focus
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('role') === 'status') texts.push(this.textContent ?? '')
    focus.call(this)
  })
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ draft: null, publishedVersion: null })
  render(<ProfileEditor />); await screen.findByLabelText('Nome público')
  request.mockResolvedValueOnce({ draft: { ...emptyProfile(), slug: 'ana', name: 'Ana', version: 1 }, publishedVersion: null })
  fireEvent.submit(screen.getByRole('form', { name: 'Editar perfil' }))
  const status = await screen.findByText('Rascunho salvo. Publique para atualizar sua página.')
  await waitFor(() => expect(document.activeElement).toBe(status))
  expect(texts).toEqual(['Rascunho salvo. Publique para atualizar sua página.'])
})
