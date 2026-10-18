import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileEditor } from './profile-editor'
import { emptyProfile, type ProfileState } from './profile-contract'
const { request, catalog, push } = vi.hoisted(() => ({ request: vi.fn(), catalog: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('./profile-api', async original => ({ ...await original<typeof import('./profile-api')>(), profileRequest: request, profileCatalog: catalog }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllGlobals() })
const original = { ...emptyProfile(), slug: 'ana-estudos', name: 'Ana', bio: 'Publicado', version: 1 }
const live: ProfileState = { draft: original, publishedVersion: 1, publishedContent: original }
it('autosave preserva o foco e a publicação; não há assistente, aba Publicação ou botão de salvar', async () => {
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ draft: null, publishedVersion: null, publishedContent: null })
  request.mockImplementation(async (_path, init) => { const { content } = JSON.parse(init.body); return { draft: { ...content, version: 1 }, publishedVersion: null, publishedContent: null } })
  render(<ProfileEditor />)
  const name = await screen.findByLabelText('Nome da página')
  fireEvent.change(name, { target: { value: 'Ana' } }); fireEvent.change(screen.getByLabelText('Endereço da página'), { target: { value: 'ana-estudos' } }); name.focus()
  await waitFor(() => expect(screen.getByRole('region', { name: 'Editor do perfil' }).dataset.saveState).toBe('saved'), { timeout: 2500 })
  expect(screen.queryByText('Salvo automaticamente')).toBeNull()
  expect(screen.getByRole('button', { name: 'Atualizar dados' }).closest('details')).toBeNull()
  expect(screen.getByRole('button', { name: 'Ver prévia' }).querySelector('svg')).toBeTruthy()
  expect(document.activeElement).toBe(name)
  expect(request.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1)
  expect(request.mock.calls.some(([path]) => path === '/publish')).toBe(false)
  expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).toBeNull()
  expect(screen.queryByRole('tab', { name: 'Publicação' })).toBeNull()
  expect(screen.queryByRole('list', { name: 'Etapas do formulário' })).toBeNull()
  expect(screen.queryByRole('group', { name: 'Link da sua página' })).toBeNull()
})
it('banner e campo alterado somem apenas após publicar a versão confirmada pelo servidor', async () => {
  catalog.mockResolvedValue([]); let state = live
  request.mockImplementation(async (path, init) => {
    if (!init) return state
    if (init.method === 'PATCH') { const { content, expectedVersion } = JSON.parse(init.body); state = { ...state, draft: { ...content, version: expectedVersion + 1 } }; return state }
    if (path === '/publish') { expect(JSON.parse(init.body).expectedVersion).toBe(2); state = { ...state, publishedVersion: 2, publishedContent: state.draft }; return { publishedRevisionId: 2 } }
  })
  render(<ProfileEditor />); await screen.findByRole('tab', { name: 'Página' }); fireEvent.click(screen.getByRole('tab', { name: 'Página' }))
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Minha alteração' } })
  expect(screen.getByText('Tem alterações não publicadas')).toBeTruthy()
  expect(screen.getByLabelText('Descrição').closest('[data-unpublished]')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
  await screen.findByText('Perfil publicado.')
  expect(screen.queryByText('Tem alterações não publicadas')).toBeNull()
  expect(screen.getByLabelText('Descrição').closest('[data-unpublished]')).toBeNull()
})
it('descartar restaura campos mesmo com edição local inválida e não salva antes do descarte', async () => {
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce({ ...live, draft: { ...original, name: 'Alterado', version: 2 } })
  request.mockResolvedValue({ ...live, draft: { ...original, version: 3 } })
  render(<ProfileEditor />); await screen.findByRole('tab', { name: 'Página' }); fireEvent.click(screen.getByRole('tab', { name: 'Página' }))
  fireEvent.change(screen.getByLabelText('Nome da página'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
  await screen.findByText('Alterações descartadas. A versão publicada foi restaurada.')
  expect((screen.getByLabelText('Nome da página') as HTMLInputElement).value).toBe('Ana')
  expect(request.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  expect(request.mock.calls.find(([path]) => path === '/discard')?.[1].body).toBe(JSON.stringify({ expectedVersion: 2 }))
  expect(screen.queryByText('Tem alterações não publicadas')).toBeNull()
})
it('falha de salvamento não abre a prévia e conserva o texto digitado', async () => {
  catalog.mockResolvedValue([]); request.mockResolvedValueOnce(live); request.mockRejectedValue(new Error('Sem conexão.'))
  render(<ProfileEditor />); await screen.findByRole('tab', { name: 'Página' }); fireEvent.click(screen.getByRole('tab', { name: 'Página' }))
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Texto mantido' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ver prévia' }))
  await screen.findByRole('alert')
  expect(push).not.toHaveBeenCalled(); expect((screen.getByLabelText('Descrição') as HTMLTextAreaElement).value).toBe('Texto mantido')
})
it('erro inicial oferece retry sem sucesso falso nem editor funcional', async () => {
  catalog.mockResolvedValue([]); request.mockRejectedValueOnce(new Error('Não foi possível carregar.'))
  render(<ProfileEditor />); await screen.findByRole('alert'); expect(screen.queryByLabelText('Nome da página')).toBeNull()
  request.mockResolvedValueOnce({ draft: null, publishedVersion: null, publishedContent: null }); fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await screen.findByLabelText('Nome da página')
})
it('endereço publicado fica visível e copia sem salvar ou publicar novamente', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  catalog.mockResolvedValue([]); request.mockResolvedValue(live)
  render(<ProfileEditor />)
  const copy = await screen.findByRole('button', { name: 'Copiar link da página' })
  const address = screen.getByRole('group', { name: 'Link da sua página' }).querySelector('a')!
  expect(address.href).toContain('/p/ana-estudos')
  expect(screen.getByRole('button', { name: 'Ver prévia' }).dataset.variant).toBe('primary')
  fireEvent.click(copy)
  await screen.findByText('Link da página copiado.')
  expect(writeText).toHaveBeenCalledWith(address.href)
  expect(request.mock.calls.filter(([, init]) => init?.method).map(([route,init])=>[route,JSON.parse(init.body)])).toEqual([['/checklist/actions',{action:'LINK_COPIED',expectedVersion:1}]])
})
it('falha ao copiar permite tentar novamente e conserva o endereço público', async () => {
  const writeText = vi.fn().mockRejectedValueOnce(new Error('permission')).mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  catalog.mockResolvedValue([]); request.mockResolvedValue(live)
  render(<ProfileEditor />)
  fireEvent.click(await screen.findByRole('button', { name: 'Copiar link da página' }))
  await screen.findByText('Não foi possível copiar. Selecione o link da página e copie manualmente.')
  expect(screen.getByRole('group', { name: 'Link da sua página' }).querySelector('a')?.href).toContain('/p/ana-estudos')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await screen.findByText('Link da página copiado.')
  expect(writeText).toHaveBeenCalledTimes(2)
})
