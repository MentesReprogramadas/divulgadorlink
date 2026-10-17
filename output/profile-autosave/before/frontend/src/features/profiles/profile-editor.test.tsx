import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileEditor } from './profile-editor'
import { emptyProfile } from './profile-contract'
const { request, catalog, push } = vi.hoisted(() => ({ request: vi.fn(), catalog: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('./profile-api', () => ({ profileRequest: request, profileCatalog: catalog }))

it('salva o rascunho antes de navegar à prévia privada e mantém a edição se falhar', async () => {
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ draft: null, publishedVersion: null })
  render(<ProfileEditor />)
  await screen.findByLabelText('Título da sua página')
  fireEvent.change(screen.getByLabelText('Título da sua página'), { target: { value: 'Minha página privada' } })
  fireEvent.change(screen.getByLabelText('Personalize o link da sua página'), { target: { value: 'minha-pagina' } })
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  request.mockRejectedValueOnce(new Error('Falha ao salvar.'))
  fireEvent.click(screen.getByRole('button', { name: 'Ver prévia' }))
  await screen.findByRole('alert')
  expect(push).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Título da sua página') as HTMLInputElement).value).toBe('Minha página privada')
  let finish: (value: unknown) => void = () => {}
  request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  fireEvent.click(screen.getByRole('button', { name: 'Ver prévia' }))
  expect(push).not.toHaveBeenCalled()
  expect(request.mock.calls.at(-1)?.[1]?.method).toBe('PATCH')
  finish({ draft: { ...emptyProfile(), name: 'Minha página privada', slug: 'minha-pagina', version: 1 }, publishedVersion: null })
  await waitFor(() => expect(push).toHaveBeenCalledWith('/painel/perfil/previa'))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks() })
it('F09-C01 vazio, falha recuperável e envio duplicado mantêm rascunho e só confirmam após persistência', async () => {
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ draft: null, publishedVersion: null })
  render(<ProfileEditor />); await screen.findByLabelText('Título da sua página')
  expect(screen.getByText('Etapa 1 de 4: Sua página')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Título da sua página'), { target: { value: 'Ana' } }); fireEvent.change(screen.getByLabelText('Personalize o link da sua página'), { target: { value: 'ana-estudos' } })
  request.mockRejectedValueOnce(new Error('Sem conexão.'))
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continuar' })); fireEvent.submit(screen.getByRole('form', { name: 'Editar perfil' })); await screen.findByRole('alert')
  expect((screen.getByLabelText('Título da sua página') as HTMLInputElement).value).toBe('Ana')
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
  render(<ProfileEditor />); await screen.findByRole('alert'); expect(screen.queryByLabelText('Título da sua página')).toBeNull()
  request.mockResolvedValueOnce({ draft: null, publishedVersion: null }); fireEvent.click(screen.getByRole('button', { name: 'Atualizar dados' })); await screen.findByLabelText('Título da sua página')
})
it('F09-C01 confirmação recebe foco somente após o texto ser renderizado', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0 })
  const texts: string[] = [], focus = HTMLElement.prototype.focus
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('role') === 'status') texts.push(this.textContent ?? '')
    focus.call(this)
  })
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ draft: null, publishedVersion: null })
  render(<ProfileEditor />); await screen.findByLabelText('Título da sua página')
  request.mockResolvedValueOnce({ draft: { ...emptyProfile(), slug: 'ana', name: 'Ana', version: 1 }, publishedVersion: null })
  for (let i = 0; i < 3; i++) fireEvent.submit(screen.getByRole('form', { name: 'Editar perfil' })); fireEvent.submit(screen.getByRole('form', { name: 'Editar perfil' }))
  const status = await screen.findByText('Rascunho salvo. Publique para atualizar sua página.')
  await waitFor(() => expect(document.activeElement).toBe(status))
  expect(texts).toEqual(['Rascunho salvo. Publique para atualizar sua página.'])
})
