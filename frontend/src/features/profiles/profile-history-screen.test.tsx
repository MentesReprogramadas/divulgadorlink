import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileHistoryScreen } from './profile-history-screen'
import { emptyProfile } from './profile-contract'
import { defaultAppearance } from './profile-appearance'
const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('./profile-api', () => ({ profileRequest: request }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const draft = { ...emptyProfile(), slug: 'minha-pagina', name: 'Rascunho atual', version: 3, appearance: { ...defaultAppearance, background: '#ece5ff' } }
const revision = { id: 'revision', version: 1, createdAt: '2026-10-17T12:00:00Z', current: false, imported: false, summary: { name: 'Título antigo', groups: 0, links: 0 } }
function prepare() {
  request.mockImplementation(async (path: string) => path === '' ? { draft, publishedVersion: 2 } : path === '/revisions' ? { revisions: [revision] } : { id: revision.id, version: 1, content: { ...draft, name: 'Título antigo', appearance: defaultAppearance }, photoAvailable: true })
}
it('F19-C01 requires explicit confirmation, guards duplicate restore and offers the existing preview only after success', async () => {
  prepare(); render(<ProfileHistoryScreen />)
  fireEvent.click(await screen.findByRole('button', { name: 'Ver diferenças' }))
  expect(await screen.findByRole('dialog', { name: 'Versão 1' })).toBeTruthy()
  const oldPreview = screen.getByRole('region', { name: 'Prévia da versão antiga' })
  const currentPreview = screen.getByRole('region', { name: 'Prévia do rascunho atual' })
  expect(within(oldPreview).getByText('Título antigo')).toBeTruthy()
  expect(currentPreview.querySelector('[inert]')?.textContent).toContain('Rascunho atual')
  expect(oldPreview.querySelector('[data-preview-device="iphone"]')).toBeTruthy();expect(currentPreview.querySelector('[data-preview-device="iphone"]')).toBeTruthy();expect(oldPreview.querySelector('[inert]')).toBeTruthy()
  expect(currentPreview.querySelector('[inert]')).toBeTruthy()
  expect(oldPreview.querySelector<HTMLElement>('[data-background]')?.style.getPropertyValue('--page-bg')).toBe(defaultAppearance.background)
  expect(currentPreview.querySelector<HTMLElement>('[data-background]')?.style.getPropertyValue('--page-bg')).toBe('#ece5ff')
  expect(request.mock.calls.some(([path]) => path.endsWith('/restore'))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar no rascunho' }))
  let finish!: (value: unknown) => void
  request.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const confirm = screen.getByRole('button', { name: 'Confirmar restauração' }); fireEvent.click(confirm); fireEvent.click(confirm)
  expect(request.mock.calls.filter(([path]) => path.endsWith('/restore'))).toHaveLength(1)
  expect(JSON.parse(request.mock.calls.at(-1)![1].body)).toEqual({ expectedVersion: 3 })
  finish({ draft: { ...draft, version: 4, name: 'Título antigo' }, publishedVersion: 2, warnings: [] })
  expect((await screen.findByRole('link', { name: 'Ver prévia' })).getAttribute('href')).toBe('/painel/perfil/previa')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})
it('F19-C01 keeps comparison and draft intact after failure; a missing old photo is explained', async () => {
  prepare(); render(<ProfileHistoryScreen />)
  await screen.findByRole('button', { name: 'Ver diferenças' })
  request.mockResolvedValueOnce({ id: 'revision', version: 1, content: { ...draft, name: 'Título antigo', avatarAssetId: 'removed-photo' }, photoAvailable: false })
  fireEvent.click(screen.getByRole('button', { name: 'Ver diferenças' }))
  expect(await screen.findByText('A foto antiga foi removida. A restauração será feita sem foto.')).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Prévia da versão antiga' }).querySelector('img[src*="removed-photo"]')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar no rascunho' })); request.mockRejectedValueOnce(new Error('O perfil mudou em outra aba. Recarregue antes de continuar.'))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar restauração' }))
  expect((await screen.findByRole('alert')).textContent).toContain('outra aba')
  expect(screen.getByRole('dialog').textContent).toContain('Rascunho atual')
  expect(screen.queryByRole('link', { name: 'Ver prévia' })).toBeNull()
})
it('F19-C02 empty and failure states avoid fake history or success', async () => {
  request.mockResolvedValueOnce({ draft: null, publishedVersion: null }).mockResolvedValueOnce({ revisions: [] })
  const view = render(<ProfileHistoryScreen />)
  expect(await screen.findByText('Seu histórico começa na primeira publicação.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Ver diferenças' })).toBeNull()
  view.unmount(); request.mockRejectedValue(new Error('Sem conexão.'))
  render(<ProfileHistoryScreen />); expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão.')
})
