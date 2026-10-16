import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RedirectScreen } from './redirect-screen'
import { RedirectRequestError } from './redirect-api'
const request = vi.hoisted(() => vi.fn())
vi.mock('./redirect-api', async original => ({ ...await original<typeof import('./redirect-api')>(), redirectRequest: request }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); request.mockReset() })
const id = '0258c08c-aec0-4435-8c20-7b73d58e4d7b'
const detail = { id, stablePath: '/r/' + id, version: 1, activeRevisionId: null, disabled: false, revisions: [] }
async function fields() {
  await screen.findByLabelText('Título do convite')
  fireEvent.change(screen.getByLabelText('Título do convite'), { target: { value: 'Estudos' } })
  fireEvent.change(screen.getByLabelText('Destino do convite'), { target: { value: 'https://example.com/convite' } })
  return screen.getByRole('form', { name: 'Editar convite permanente' })
}
it('F12-C01 vazio, offline, reenvio com mesma identidade e bloqueio de duplicação até persistir', async () => {
  request.mockResolvedValue({ items: [], nextCursor: null })
  render(<RedirectScreen />); const form = await fields()
  expect(screen.getByText('Crie seu primeiro endereço permanente no formulário abaixo.')).toBeTruthy()
  request.mockRejectedValueOnce(new RedirectRequestError('Sem conexão.'))
  fireEvent.submit(form); await screen.findByRole('alert')
  expect((screen.getByLabelText('Título do convite') as HTMLInputElement).value).toBe('Estudos')
  let resolve: (value: unknown) => void = () => {}
  request.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  fireEvent.submit(form); fireEvent.submit(form)
  const posts = request.mock.calls.filter(([, init]) => init?.method === 'POST')
  expect(posts).toHaveLength(2); expect(posts[0][1].body).toBe(posts[1][1].body)
  expect(screen.queryByText(/Destino validado\./)).toBeNull()
  request.mockImplementation(async path => path === '/' + id ? detail : { items: [], nextCursor: null })
  resolve({ id, destinationRevision: { status: 'APPROVED' } })
  const status = await screen.findByText('Destino validado. O endereço permanente está pronto para compartilhar.')
  await waitFor(() => expect(document.activeElement).toBe(status))
  expect((screen.getByLabelText('Link permanente') as HTMLInputElement).value).toContain('/r/' + id)
})
it('F12-C01 erro de conteúdo conserva os campos e carrega o endereço reservado para correção', async () => {
  request.mockResolvedValue({ items: [], nextCursor: null })
  render(<RedirectScreen />); const form = await fields()
  request.mockRejectedValueOnce(new RedirectRequestError('Conteúdo suspeito. Corrija o título.', { id, version: 1 }, 422))
  request.mockImplementation(async path => path === '/' + id ? detail : { items: [], nextCursor: null })
  fireEvent.submit(form)
  expect((await screen.findByRole('alert')).textContent).toContain('Conteúdo suspeito')
  expect((screen.getByLabelText('Destino do convite') as HTMLInputElement).value).toBe('https://example.com/convite')
  expect(screen.getByLabelText('Link permanente')).toBeTruthy()
})
it('F12-C02 falha inicial não cria formulário funcional nem anuncia sucesso; recuperar é explícito', async () => {
  request.mockRejectedValueOnce(new RedirectRequestError('Acesso indisponível.'))
  render(<RedirectScreen />); await screen.findByRole('alert')
  expect(screen.queryByLabelText('Título do convite')).toBeNull()
  request.mockResolvedValue({ items: [], nextCursor: null }); fireEvent.click(screen.getByRole('button', { name: 'Atualizar dados' }))
  await screen.findByLabelText('Título do convite')
  expect(screen.queryByText(/Destino validado\./)).toBeNull()
})
