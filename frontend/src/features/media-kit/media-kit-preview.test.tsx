import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { emptyProfile } from '@/features/profiles/profile-contract'
import { MediaKitPreview } from './media-kit-preview'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/features/profiles/profile-api', () => ({ profileRequest: request }))
vi.mock('@/components/layout/ondas-atmosphere', () => ({ OndasAtmosphere: () => <div data-testid="preview-atmosphere" aria-hidden="true" /> }))
vi.mock('./media-kit-view', () => ({ MediaKitView: () => <article aria-label="Apresentação do publicador" /> }))
vi.mock('./media-kit-pending', () => ({ MediaKitPending: () => <div role="status">Carregando apresentação</div> }))

afterEach(() => { cleanup(); vi.resetAllMocks() })

it('usa a superfície da plataforma no erro e permite tentar novamente sem pintar o conteúdo do publicador', async () => {
  request.mockRejectedValueOnce(new Error('Crie sua página antes de preparar o mídia kit.')).mockResolvedValueOnce({ restricted: false, presentation: emptyProfile() })
  render(<MediaKitPreview />)
  expect((await screen.findByRole('alert')).textContent).toContain('Crie sua página')
  expect(screen.getByTestId('preview-atmosphere')).toBeTruthy()
  expect(screen.queryByRole('article', { name: 'Apresentação do publicador' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Voltar à apresentação' }).getAttribute('href')).toBe('/painel/perfil/midia-kit')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  await screen.findByRole('article', { name: 'Apresentação do publicador' })
  expect(screen.queryByTestId('preview-atmosphere')).toBeNull()
  expect(request).toHaveBeenCalledTimes(2)
})

it('preserva a apresentação carregada sem atmosfera da plataforma', async () => {
  request.mockResolvedValueOnce({ restricted: false, presentation: emptyProfile() })
  render(<MediaKitPreview />)
  await screen.findByRole('article', { name: 'Apresentação do publicador' })
  expect(screen.queryByTestId('preview-atmosphere')).toBeNull()
  expect(request).toHaveBeenCalledWith('/media-kit/preview')
})

it('mantém a prévia pendente da apresentação sem solicitar dados no pendingOnly', () => {
  render(<MediaKitPreview pendingOnly />)
  expect(screen.getByRole('status').textContent).toContain('Carregando apresentação')
  expect(screen.queryByTestId('preview-atmosphere')).toBeNull()
  expect(request).not.toHaveBeenCalled()
})
