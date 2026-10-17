import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ModerationQueue } from './queue'

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
  await screen.findByText('Este link não tem uma revisão aberta.')
  expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
})
