import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Page from './page'

const { api, sync } = vi.hoisted(() => ({ api: vi.fn(), sync: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/lib/campaign-touch', () => ({ syncCampaignTouch: sync }))

afterEach(() => {
  cleanup()
  document.cookie = 'tla_consent=; Path=/; Max-Age=0'
  vi.resetAllMocks()
})

it('aguarda o cookie de campanha antes de enviar o cadastro consentido', async () => {
  let finish!: () => void
  sync.mockReturnValue(new Promise<void>(resolve => { finish = resolve }))
  api.mockResolvedValue({ status: 409, body: {} })
  document.cookie = 'tla_consent=marketing; Path=/'
  render(<Page />)
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Pessoa' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@example.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha-1234' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Criar conta' }).closest('form')!)
  expect(sync).toHaveBeenCalledOnce()
  expect(api).not.toHaveBeenCalled()
  finish()
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/auth/register', expect.objectContaining({ method: 'POST' })))
  expect((await screen.findByRole('alert')).textContent).toContain('Esse e-mail já está cadastrado.')
})
