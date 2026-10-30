import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { ShopeeSettings, type ShopeeStatus } from './shopee-settings'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const status: ShopeeStatus = { provider: 'SHOPEE', configured: true, connected: false, status: 'CONFIGURED', accountLabel: 'Conta pet', subIds: ['pets'], updatedAt: null }

it('sends own credentials once, clears masked fields and refreshes server status', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: {} })
  const onChanged = vi.fn().mockResolvedValue(undefined)
  render(<ShopeeSettings status={status} onChanged={onChanged} />)
  fireEvent.click(screen.getByRole('button', { name: 'Configurar Shopee' }))
  const appId = screen.getByLabelText('App ID Shopee') as HTMLInputElement
  const secret = screen.getByLabelText('Segredo Shopee') as HTMLInputElement
  expect(appId.value).toBe(''); expect(secret.type).toBe('password'); expect(appId.type).toBe('password')
  fireEvent.change(appId, { target: { value: '123456' } })
  fireEvent.change(secret, { target: { value: 'fixture-only-secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar credenciais Shopee' }))
  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce())
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/catalog/shopee', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ appId: '123456', secret: 'fixture-only-secret', accountLabel: 'Conta pet', subIds: ['pets'] }) }))
  fireEvent.click(await screen.findByRole('button', { name: 'Configurar Shopee' }))
  expect((screen.getByLabelText('Segredo Shopee') as HTMLInputElement).value).toBe('')
})

it('never displays a raw credential-bearing provider error', async () => {
  vi.mocked(api).mockResolvedValue({ status: 400, body: { message: 'secret=fixture-sensitive-value appId=123456' } })
  render(<ShopeeSettings status={status} onChanged={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Verificar conexão Shopee' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível concluir')
  expect(screen.queryByText(/fixture-sensitive-value/)).toBeNull()
  expect(screen.queryByText('Conexão verificada')).toBeNull()
})

it('requires confirmation before removing credentials', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: {} })
  render(<ShopeeSettings status={status} onChanged={vi.fn().mockResolvedValue(undefined)} />)
  fireEvent.click(screen.getByRole('button', { name: 'Desconectar Shopee' }))
  expect(api).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar desconexão Shopee' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/catalog/shopee', expect.objectContaining({ method: 'DELETE' })))
})
