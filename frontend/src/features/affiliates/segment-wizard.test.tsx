import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { SegmentWizard } from './segment-wizard'
import { AffiliateImageUpload } from './affiliate-image-upload'
import { prepareAvatar } from '@/features/profiles/prepare-avatar'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
vi.mock('@/features/profiles/prepare-avatar', () => ({ prepareAvatar: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const instances = [
  { id: 'one', name: 'Principal', configured: true, enabled: true, ownerPhone: '5511999999999' },
  { id: 'two', name: 'Reserva', configured: true, enabled: true, ownerPhone: null },
]
function identity() {
  fireEvent.change(screen.getByLabelText('Nome da segmentação'), { target: { value: 'Natal' } })
  fireEvent.change(screen.getByLabelText('Nome dos grupos no WhatsApp'), { target: { value: 'Ofertas de Natal' } })
  expect((screen.getByLabelText('Endereço do convite permanente') as HTMLInputElement).value).toBe('natal')
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para WhatsApp' }))
}

it('preserva o rascunho entre etapas e exige duas conexões abertas antes de salvar a seleção', async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  vi.mocked(api).mockResolvedValue({ status: 200, body: { state: 'open' } })
  render(<SegmentWizard instances={instances} save={save} />)
  identity()
  fireEvent.click(screen.getByRole('checkbox', { name: /Principal/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Reserva/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir conexões e continuar' }))
  await screen.findByRole('heading', { name: 'Confira sua segmentação' })
  expect(api).toHaveBeenCalledTimes(2)
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Identidade dos grupos.*concluída/ }))
  expect((screen.getByLabelText('Nome da segmentação') as HTMLInputElement).value).toBe('Natal')
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para WhatsApp' }))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir conexões e continuar' }))
  await screen.findByRole('button', { name: 'Criar segmentação' })
  fireEvent.click(screen.getByRole('button', { name: 'Criar segmentação' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Natal', groupName: 'Ofertas de Natal', slug: 'natal', instanceIds: ['one', 'two'], autoExpand: true, joinMode: 'REDIRECT' })))
})

it('orienta conexão pelo QR code e não avança se a conta estiver desconectada', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { state: 'close' } })
  render(<SegmentWizard instances={instances} save={vi.fn()} />)
  identity()
  fireEvent.click(screen.getByRole('checkbox', { name: /Principal/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir conexões e continuar' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Conecte pelo QR code')
  expect(screen.queryByRole('button', { name: 'Criar segmentação' })).toBeNull()
})

it('permite cadastrar e conectar uma conta dentro da criação da primeira segmentação', async () => {
  vi.mocked(api).mockImplementation(async path => ({ status: 200, body: path.endsWith('/connect') ? { base64: 'data:image/png;base64,AA==' } : path.endsWith('/status') ? { state: 'open' } : path === '/v1/admin/affiliates' ? { instances: [instances[0]] } : instances[0] }))
  render(<SegmentWizard instances={[]} save={vi.fn()} />)
  identity()
  expect(screen.getByText(/Você ainda não tem uma conexão/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Nome para identificar esta conta'), { target: { value: 'Principal' } })
  fireEvent.change(screen.getByLabelText('Participante inicial dos grupos'), { target: { value: '5511999999999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e conectar WhatsApp' }))
  await screen.findByRole('checkbox', { name: /Principal/ })
  await screen.findByRole('img', { name: 'QR code de Principal' })
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/instances/one/connect', expect.objectContaining({ method: 'POST' }))
  expect(screen.queryByLabelText('Chave da conexão (opcional)')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Já conectei; conferir' }))
  await waitFor(() => expect(screen.queryByRole('img', { name: 'QR code de Principal' })).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Conferir conexões e continuar' }))
  await screen.findByRole('button', { name: 'Criar segmentação' })
})

it('normaliza a imagem e salva uma referência privada sem aceitar uma URL digitada', async () => {
  const change = vi.fn()
  vi.mocked(prepareAvatar).mockResolvedValue('webp-base64')
  vi.mocked(api).mockResolvedValue({ status: 200, body: { url: 'affiliate-image:123' } })
  render(<AffiliateImageUpload value="" onChange={change} />)
  const file = new File(['fixture'], 'natal.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText('Foto dos grupos'), { target: { files: [file] } })
  await waitFor(() => expect(change).toHaveBeenCalledWith('affiliate-image:123'))
  expect(prepareAvatar).toHaveBeenCalledWith(file)
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/images', expect.objectContaining({ method: 'POST', body: JSON.stringify({ base64: 'webp-base64' }) }))
})

it('mantém a conta criada quando o QR falha e repete somente a conexão, sem permitir pular o pareamento', async () => {
  let attempts = 0
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/connect')) return ++attempts === 1 ? { status: 503, body: { message: 'QR indisponível.' } } : { status: 200, body: { state: 'connecting', base64: 'data:image/png;base64,AA==' } }
    return { status: 200, body: path.endsWith('/status') ? { state: 'close' } : instances[0] }
  })
  const save = vi.fn()
  render(<SegmentWizard instances={[]} save={save} />)
  identity()
  fireEvent.change(screen.getByLabelText('Nome para identificar esta conta'), { target: { value: 'Principal' } })
  fireEvent.change(screen.getByLabelText('Participante inicial dos grupos'), { target: { value: '5511999999999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e conectar WhatsApp' }))
  await screen.findByText('QR indisponível.')
  expect(screen.queryByRole('button', { name: 'Salvar e conectar WhatsApp' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Gerar outro QR code' }))
  await screen.findByRole('img', { name: 'QR code de Principal' })
  expect(vi.mocked(api).mock.calls.filter(([path]) => path === '/v1/admin/affiliates/instances')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Conferir conexões e continuar' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Conecte pelo QR code')
  expect(save).not.toHaveBeenCalled()
})

it('permite remover uma conexão pausada já selecionada ao editar a segmentação', () => {
  render(<SegmentWizard instances={[{ ...instances[0], enabled: false }, instances[1]]} segment={{ id: 'segment', name: 'Natal', slug: 'natal', description: '', imageUrl: null, capacity: 1024, autoExpand: false, instanceId: 'one', instanceIds: ['one'], enabled: true, provisionState: 'IDLE' }} save={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para WhatsApp' }))
  const paused = screen.getByRole('checkbox', { name: /Principal/ }) as HTMLInputElement
  expect(paused.checked).toBe(true)
  expect(paused.disabled).toBe(false)
  fireEvent.click(paused)
  expect(paused.checked).toBe(false)
  expect(paused.disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /Reserva/ }))
  expect((screen.getByRole('button', { name: 'Conferir conexões e continuar' }) as HTMLButtonElement).disabled).toBe(false)
})

it('troca os campos de edição ao escolher outra conta e preserva o participante correto', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { saved: true } })
  render(<SegmentWizard instances={instances} save={vi.fn()} />)
  identity()
  fireEvent.click(screen.getByRole('button', { name: 'Editar conexão de Principal' }))
  expect((screen.getByLabelText('Participante inicial dos grupos') as HTMLInputElement).value).toBe('5511999999999')
  fireEvent.click(screen.getByRole('button', { name: 'Editar conexão de Reserva' }))
  expect((screen.getByLabelText('Nome para identificar esta conta') as HTMLInputElement).value).toBe('Reserva')
  expect((screen.getByLabelText('Participante inicial dos grupos') as HTMLInputElement).value).toBe('')
  fireEvent.change(screen.getByLabelText('Participante inicial dos grupos'), { target: { value: '5511888888888' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/instances/two', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ ownerPhone: '5511888888888' }) })))
})

it('não inicia pareamento se o assistente for desmontado enquanto a conta é cadastrada', async () => {
  let complete!: (value: { status: number; body: typeof instances[0] }) => void
  vi.mocked(api).mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const saving = vi.fn(), view = render(<SegmentWizard instances={[]} save={vi.fn()} onConnectionSaving={saving} />)
  identity()
  fireEvent.change(screen.getByLabelText('Nome para identificar esta conta'), { target: { value: 'Principal' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e conectar WhatsApp' }))
  expect(saving).toHaveBeenLastCalledWith(true)
  view.unmount()
  complete({ status: 200, body: instances[0] })
  await waitFor(() => expect(saving).toHaveBeenLastCalledWith(false))
  expect(api).toHaveBeenCalledTimes(1)
})

it('salva a tela de convite quando escolhida em vez do redirecionamento padrão', async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  vi.mocked(api).mockResolvedValue({ status: 200, body: { state: 'open' } })
  render(<SegmentWizard instances={instances} save={save} />)
  expect((screen.getByLabelText('Redirecionar para WhatsApp (padrão)') as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByLabelText('Mostrar tela de convite'))
  identity()
  fireEvent.click(screen.getByRole('checkbox', { name: /Principal/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir conexões e continuar' }))
  await screen.findByRole('button', { name: 'Criar segmentação' })
  fireEvent.click(screen.getByRole('button', { name: 'Criar segmentação' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ joinMode: 'SCREEN' })))
})
