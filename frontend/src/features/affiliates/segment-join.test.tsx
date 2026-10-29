import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { SegmentJoin } from './segment-join'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('redirecionamento padrão consulta uma vez mesmo em StrictMode e permite repetir falha manualmente', async () => {
  vi.mocked(api).mockImplementation(async path => path.endsWith('/join') ? { status: 503, body: { message: 'WhatsApp indisponível' } } : { status: 200, body: { name: 'Natal', description: '', available: true } })
  render(<StrictMode><SegmentJoin slug="natal" /></StrictMode>)
  expect((await screen.findByRole('alert')).textContent).toContain('WhatsApp indisponível')
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(1)
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/visit'))).toHaveLength(1)
  expect(JSON.parse(vi.mocked(api).mock.calls.find(([path]) => path.endsWith('/join'))![1]!.body as string).source).toBe('AUTOMATIC')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(2))
  expect(JSON.parse(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))[1][1]!.body as string).source).toBe('BUTTON')
})

it('tela opcional só consulta grupo após clique e bloqueia destino externo', async () => {
  vi.mocked(api).mockImplementation(async path => path.endsWith('/join') ? { status: 200, body: { url: 'https://evil.test/invite' } } : { status: 200, body: { name: 'Natal', description: '', available: true, joinMode: 'SCREEN' } })
  render(<SegmentJoin slug="natal" />)
  await screen.findByRole('heading', { name: 'Natal' })
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no grupo de WhatsApp' }))
  expect((await screen.findByRole('alert')).textContent).toContain('convite retornado não é válido')
})

it('falha na medição não impede a abertura do convite', async () => {
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/visit')) throw new Error('analytics offline')
    return path.endsWith('/join') ? { status: 503, body: { message: 'Conferindo vagas' } } : { status: 200, body: { name: 'Natal', description: '', available: true } }
  })
  render(<SegmentJoin slug="natal" />)
  expect((await screen.findByRole('alert')).textContent).toContain('Conferindo vagas')
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(1)
})
