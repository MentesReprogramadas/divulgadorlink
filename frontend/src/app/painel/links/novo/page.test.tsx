import { chooseSelect } from '@/test-select'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Page from './page'

const push = vi.fn()
const api = vi.fn()
const trackGoogleAdsLinkSubmission = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))
vi.mock('@/components/domain/panel', () => ({
  useAreaSession: () => ({ role: 'USER', status: 'ACTIVE', canSubmit: true }),
}))
vi.mock('@/domain/meta-pixel', () => ({ trackMeta: () => undefined }))
vi.mock('@/domain/google-ads', () => ({
  trackGoogleAdsLinkSubmission: (...args: unknown[]) => trackGoogleAdsLinkSubmission(...args),
}))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true }
  localStorage.clear()
  push.mockReset()
  api.mockReset()
  trackGoogleAdsLinkSubmission.mockReset()
  api.mockImplementation((path: string) => {
    if (path === '/v1/home') {
      return Promise.resolve({
        status: 200,
        body: {
          networks: [{ id: 'net', name: 'Site', slug: 'site' }],
          niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
        },
      })
    }
    if (String(path).startsWith('/v1/links/mine')) return Promise.resolve({ status: 200, body: { slotsUsed: 1 } })
    return Promise.resolve({ status: 200, body: {} })
  })
})

afterEach(cleanup)

async function fillAndSend() {
  fireEvent.change(await screen.findByLabelText('Título do link'), { target: { value: 'Grupo' } })
  fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/grupo' } }); fireEvent.click(screen.getByRole('button', { name: 'Continuar' })); fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição do grupo' } })
  fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/grupo' } })
  await chooseSelect(screen.getByLabelText('Rede do link'), 'net')
  await chooseSelect(screen.getByLabelText('Assunto do link'), 'niche')
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })); fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
}

describe('envio de link', () => {
  it('mostra o resultado da fila e segue para os links', async () => {
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 201, body: { id: 'link-1', status: 'PENDING_MODERATION' } })
      }
      if (path === '/v1/home') {
        return Promise.resolve({
          status: 200,
          body: {
            networks: [{ id: 'net', name: 'Site', slug: 'site' }],
            niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
          },
        })
      }
      return Promise.resolve({ status: 200, body: { slotsUsed: 0 } })
    })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByRole('heading', { name: 'Enviado para análise.' })).toBeTruthy()
    expect(screen.queryByText('Publicado')).toBeNull()
    expect(trackGoogleAdsLinkSubmission).toHaveBeenCalledExactlyOnceWith('link-1')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/painel/links'), { timeout: 4000 })
  })

  it('mostra a recusa sem chamar de análise', async () => {
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 201, body: { id: 'link-2', status: 'PRE_REJECTED', message: 'Envio não aceito.' } })
      }
      if (path === '/v1/home') {
        return Promise.resolve({
          status: 200,
          body: {
            networks: [{ id: 'net', name: 'Site', slug: 'site' }],
            niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
          },
        })
      }
      return Promise.resolve({ status: 200, body: {} })
    })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByRole('heading', { name: 'Envio não aceito' })).toBeTruthy()
    expect(screen.queryByText('Enviado para análise.')).toBeNull()
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus links' }))
    expect(push).toHaveBeenCalledWith('/painel/links')
  })

  it('deixa o erro no formulário quando o envio não entra', async () => {
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 409, body: { message: 'Esse link já está no catálogo.' } })
      }
      if (path === '/v1/home') {
        return Promise.resolve({
          status: 200,
          body: {
            networks: [{ id: 'net', name: 'Site', slug: 'site' }],
            niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
          },
        })
      }
      return Promise.resolve({ status: 200, body: {} })
    })
    render(<Page />)
    await fillAndSend()
    expect((await screen.findByRole('alert')).textContent).toContain('Esse link já está no catálogo.')
    expect(screen.queryByRole('heading', { name: 'Enviado para análise.' })).toBeNull()
    expect(push).not.toHaveBeenCalled()
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
  })

  it('conta link publicado automaticamente, mas não conta abrir o formulário', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 201, body: { id: 'link-published', status: 'PUBLISHED' } })
      }
      return defaultApi(path, init)
    })
    render(<Page />)
    await screen.findByLabelText('Título do link')
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
    await fillAndSend()
    await waitFor(() => expect(trackGoogleAdsLinkSubmission).toHaveBeenCalledExactlyOnceWith('link-published'))
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus links' }))
  })

  it('não conta falha de conexão e preserva o rascunho', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') return Promise.reject(new Error('offline'))
      return defaultApi(path, init)
    })
    render(<Page />)
    await fillAndSend()
    expect((await screen.findByRole('alert')).textContent).toContain('Seu rascunho foi mantido')
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
    expect(localStorage.getItem('tla-link-draft')).toContain('https://example.com/grupo')
  })
})
