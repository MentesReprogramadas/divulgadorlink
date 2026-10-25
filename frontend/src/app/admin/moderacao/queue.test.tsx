import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ModerationQueue } from './queue'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ status: 200, body: { cases: [
  { id: 'case-a', linkId: 'a', name: 'Link selecionado', description: '', url: '', status: 'PENDING_MODERATION', niche: '', network: '', ownerName: '', ownerEmail: '', source: 'SUBMISSION' },
  { id: 'case-b', linkId: 'b', name: 'Outro link', description: '', url: '', status: 'PENDING_MODERATION', niche: '', network: '', ownerName: '', ownerEmail: '', source: 'SUBMISSION' },
] } })) }))
afterEach(cleanup)
it('abre somente a revisão do link selecionado e mantém o caminho para toda a fila', async () => {
  render(<ModerationQueue linkId="a" />)
  await screen.findByRole('heading', { name: 'Link selecionado' })
  expect(screen.queryByRole('heading', { name: 'Outro link' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Ver toda a fila' }).getAttribute('href')).toBe('/admin/moderacao')
})
it('não oferece decisão quando o link não tem caso aberto', async () => {
  render(<ModerationQueue linkId="missing" />)
  await screen.findByText('Nada por aqui ainda.')
  expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
})
it('mostra falha e libera a ação quando a conexão da decisão cai', async () => {
  const implementation = vi.mocked(api).getMockImplementation()!
  vi.mocked(api).mockImplementation((path, init) => init?.method === 'POST' ? Promise.reject(new Error('offline')) : implementation(path, init))
  try {
    render(<ModerationQueue linkId="a" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    await screen.findByRole('alert')
    expect((screen.getByRole('button', { name: 'Aprovar' }) as HTMLButtonElement).disabled).toBe(false)
  } finally { vi.mocked(api).mockImplementation(implementation) }
})
