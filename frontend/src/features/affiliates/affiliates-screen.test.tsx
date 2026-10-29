import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { AffiliatesScreen } from './affiliates-screen'
import { SendForm } from './affiliate-forms'
import { SegmentJoin } from './segment-join'
import type { AffiliateOffer, AffiliateSnapshot } from './contracts'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
const empty: AffiliateSnapshot = { segments: [], groups: [], instances: [], offers: [], broadcasts: [], deliveries: [], summary: { segments: 0, groups: 0, instances: 0, offers: 0, pending: 0, sent: 0, uncertain: 0, failed: 0 } }
beforeEach(() => vi.mocked(api).mockResolvedValue({ status: 200, body: empty }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('mostra um primeiro passo claro e abre cadastro da conta', async () => {
  const created = { id: 'new-instance', name: 'Natal 01', ownerPhone: '5511999999999', configured: true, enabled: true }
  vi.mocked(api).mockImplementation(async (path = '') => ({ status: 200, body: path.endsWith('/connect') ? { base64: 'data:image/png;base64,AA==' } : path.endsWith('/instances') ? created : empty }))
  const initial = render(<AffiliatesScreen />)
  await screen.findByText('Comece pela sua primeira segmentação')
  expect(screen.getByRole('button', { name: 'Criar primeira segmentação' })).toBeTruthy()
  initial.unmount(); render(<AffiliatesScreen initialArea="instances" />); await screen.findByRole('button', { name: 'Adicionar conta' })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta' }))
  const dialog = screen.getByRole('dialog', { name: 'Adicionar conexão' })
  fireEvent.change(within(dialog).getByLabelText('Nome para identificar esta conta'), { target: { value: 'Natal 01' } })
  fireEvent.change(within(dialog).getByLabelText('Participante inicial dos grupos'), { target: { value: '5511999999999' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar e conectar WhatsApp' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/instances', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Natal 01', ownerPhone: '5511999999999' }) })))
  await screen.findByRole('img', { name: 'QR code para conectar Natal 01' })
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/instances/new-instance/connect', expect.objectContaining({ method: 'POST' }))
  expect(screen.queryByLabelText('Chave da conexão (opcional)')).toBeNull()
})

it('não apresenta dados inventados quando a autorização é negada', async () => {
  vi.mocked(api).mockResolvedValue({ status: 403, body: { message: 'Acesso restrito.' } })
  render(<AffiliatesScreen />)
  expect((await screen.findByRole('alert')).textContent).toBe('Acesso restrito.')
  expect(screen.queryByText('Resumo da operação')).toBeNull()
  expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy()
})

it('bloqueia fechar durante o cadastro e não reabre um QR cancelado sobre outro formulário', async () => {
  const created = { id: 'new-instance', name: 'Principal', configured: true, enabled: true }
  let completeCreate!: (value: { status: number; body: typeof created }) => void
  let completeQr!: (value: { status: number; body: { base64: string } }) => void
  vi.mocked(api).mockImplementation(async (path = '') => {
    if (path.endsWith('/instances')) return new Promise(resolve => { completeCreate = resolve })
    if (path.endsWith('/connect')) return new Promise(resolve => { completeQr = resolve })
    return { status: 200, body: empty }
  })
  render(<AffiliatesScreen initialArea="instances" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar conta' }))
  const dialog = screen.getByRole('dialog', { name: 'Adicionar conexão' })
  fireEvent.change(within(dialog).getByLabelText('Nome para identificar esta conta'), { target: { value: 'Principal' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar e conectar WhatsApp' }))
  expect((within(dialog).getByRole('button', { name: 'Fechar janela' }) as HTMLButtonElement).disabled).toBe(true)
  completeCreate({ status: 200, body: created })
  const qrDialog = await screen.findByRole('dialog', { name: 'Conectar WhatsApp' })
  await waitFor(() => expect(completeQr).toBeTypeOf('function'))
  fireEvent.click(within(qrDialog).getByRole('button', { name: 'Fechar janela' }))
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta' }))
  completeQr({ status: 200, body: { base64: 'data:image/png;base64,AA==' } })
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Adicionar conexão' })).toBeTruthy())
  expect(screen.queryByRole('img', { name: 'QR code para conectar Principal' })).toBeNull()
})

it('não fecha um novo formulário quando uma conferência cancelada termina depois', async () => {
  const instance = { id: 'principal', name: 'Principal', configured: true, enabled: true }
  let statusChecks = 0
  let completeStatus!: (value: { status: number; body: { state: string } }) => void
  vi.mocked(api).mockImplementation(async (path = '') => {
    if (path.endsWith('/connect')) return { status: 200, body: { state: 'open' } }
    if (path.endsWith('/status')) { if (++statusChecks > 1) return new Promise(resolve => { completeStatus = resolve }); return { status: 200, body: { state: 'close' } } }
    return { status: 200, body: { ...empty, instances: [instance] } }
  })
  render(<AffiliatesScreen initialArea="instances" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Conectar WhatsApp' }))
  const dialog = await screen.findByRole('dialog', { name: 'Conectar WhatsApp' })
  await within(dialog).findByText('A conta já está conectada.')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Já conectei; conferir' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar janela' }))
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta' }))
  completeStatus({ status: 200, body: { state: 'open' } })
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Adicionar conexão' })).toBeTruthy())
})

const offer: AffiliateOffer = { id: 'offer-1', segmentId: 'segment-1', title: 'Árvore de Natal', productUrl: 'https://www.mercadolivre.com.br/p/MLB123', affiliateUrl: 'https://meli.la/teste', priceCents: 3990, oldPriceCents: null, imageUrl: null, note: '', status: 'DRAFT', checkedAt: '2026-10-28T12:00:00Z', expiresAt: null }
it('requer revisão e reutiliza a chave quando a confirmação do envio falha', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Falha de conexão.')).mockResolvedValueOnce(undefined)
  render(<SendForm offer={offer} groupCount={3} save={save} />)
  expect(screen.queryByText(/De:/)).toBeNull()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }))
  await screen.findByText('Falha de conexão.')
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }))
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
  expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0])
  expect(save.mock.calls[0][0].idempotencyKey).toMatch(/^[a-f0-9-]{36}$/)
})

it('a abertura conta a visita sem entrar; entrar exige clique e rejeita destino externo', async () => {
  vi.mocked(api).mockImplementation(async (_path, init) => init?.method === 'POST' ? { status: 200, body: { url: 'https://outside.example/' } } : { status: 200, body: { name: 'Natal', description: 'Ofertas de Natal', available: true, joinMode: 'SCREEN' } })
  render(<SegmentJoin slug="natal" />)
  await screen.findByRole('heading', { name: 'Natal' })
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(0)
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/visit'))).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no grupo de WhatsApp' }))
  expect((await screen.findByRole('alert')).textContent).toContain('convite retornado não é válido')
  expect(api).toHaveBeenCalledWith('/v1/public/affiliates/natal/join', expect.objectContaining({ method: 'POST', headers: { 'x-workspace-owner': 'self' } }))
})

it('permite conferir o convite ao vivo mesmo quando a última leitura não tinha vaga', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { name: 'Natal', description: 'Ofertas', available: false, joinMode: 'SCREEN' } })
  render(<SegmentJoin slug="natal" />)
  await screen.findByRole('heading', { name: 'Natal' })
  expect(screen.getByRole('button', { name: 'Entrar no grupo de WhatsApp' }).hasAttribute('disabled')).toBe(false)
  expect(screen.queryByText('Ofertas', { exact: true })).toBeNull()
})
