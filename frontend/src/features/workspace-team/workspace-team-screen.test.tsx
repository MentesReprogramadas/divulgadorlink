import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkspaceTeamScreen } from './workspace-team-screen'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('carregamento da equipe mostra blocos dentro dos cartões de vidro sem consultar transporte', () => {
  render(<WorkspaceTeamScreen pendingOnly />)
  const region = screen.getByRole('region', { name: 'Equipe da plataforma' })
  expect(region.getAttribute('aria-busy')).toBe('true')
  expect(region.querySelectorAll('[data-skeleton-block]').length).toBeGreaterThan(0)
  expect((screen.getByRole('button', { name: 'Convidar colaborador' }) as HTMLButtonElement).disabled).toBe(true)
  expect(api).not.toHaveBeenCalled()
})

it('falha inicial não afirma uma equipe vazia e a retentativa recupera os membros', async () => {
  vi.mocked(api).mockResolvedValueOnce({ status: 503, body: { message: 'Equipe indisponível.' } }).mockResolvedValue({ status: 200, body: { sections: [], members: [{ id: 'member-a', name: 'Ana', version: 1, grants: {} }], invitations: [], workspaces: [] } })
  render(<WorkspaceTeamScreen />)
  await screen.findByText('Equipe indisponível.')
  expect(screen.queryByText('Convide pessoas e escolha o que cada uma pode acessar.')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Compartilhados comigo' }))
  expect(screen.queryByText('Nenhuma conta compartilhada com você no momento.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Minha equipe' }))
  await screen.findByRole('heading', { name: 'Ana' })
})

it('falha ao atualizar conserva membros reais sem mostrar vazio', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { sections: [], members: [{ id: 'member-a', name: 'Ana', version: 1, grants: {} }], invitations: [], workspaces: [] } })
  render(<WorkspaceTeamScreen />)
  await screen.findByRole('heading', { name: 'Ana' })
  vi.mocked(api).mockResolvedValue({ status: 503, body: { message: 'Equipe indisponível.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar dados' }))
  await screen.findByText('Equipe indisponível.')
  expect(screen.getByRole('heading', { name: 'Ana' })).toBeTruthy()
  expect(screen.queryByText('Convide pessoas e escolha o que cada uma pode acessar.')).toBeNull()
})
