import { afterEach, expect, it, vi } from 'vitest'
import { loadCatalog } from '@/lib/catalog-page'
import { forward } from '@/lib/upstream'
import { inviteMetadata } from './invite-metadata'
import { GET } from '@/app/ofertas/entrar/[slug]/imagem/route'

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'temlinkaqui.com' }) }))
vi.mock('@/lib/catalog-page', () => ({ loadCatalog: vi.fn() }))
vi.mock('@/lib/upstream', () => ({ tenantHost: () => 'temlinkaqui.com', forward: vi.fn() }))
afterEach(() => vi.clearAllMocks())

it('gera a prévia por segmentação com imagem pública absoluta e mantém noindex', async () => {
  vi.mocked(loadCatalog).mockResolvedValue({ status: 200, body: { name: 'Achadinhos de Natal', joinMode: 'REDIRECT', shareImageUrl: '/ofertas/entrar/natal/imagem?v=avatar-1' } })
  expect(await inviteMetadata('natal')).toMatchObject({ title: 'Achadinhos de Natal', robots: { index: false, follow: false }, alternates: { canonical: 'https://temlinkaqui.com/ofertas/entrar/natal' }, openGraph: { title: 'Achadinhos de Natal', type: 'website', images: [{ url: 'https://temlinkaqui.com/ofertas/entrar/natal/imagem?v=avatar-1', type: 'image/jpeg', width: 600, height: 600, alt: 'Foto do grupo Achadinhos de Natal' }] } })
  expect(loadCatalog).toHaveBeenCalledWith('/api/v1/public/affiliates/natal')
})

it('convite indisponível ou erro na API não inventa imagem nem bloqueia a página', async () => {
  vi.mocked(loadCatalog).mockResolvedValue({ status: 404, body: null })
  expect((await inviteMetadata('natal')).openGraph).toBeUndefined()
  vi.mocked(loadCatalog).mockRejectedValue(new Error('offline'))
  expect((await inviteMetadata('natal')).robots).toEqual({ index: false, follow: false })
  vi.clearAllMocks()
  await inviteMetadata('../admin')
  expect(loadCatalog).not.toHaveBeenCalled()
})

it('serve bytes da foto sem cookies ou autenticação e preserva indisponibilidade', async () => {
  const bytes = Buffer.from([255, 216, 255, 217])
  vi.mocked(forward).mockResolvedValue({ status: 200, headers: {}, body: bytes })
  const response = await GET(new Request('https://temlinkaqui.com/ofertas/entrar/natal/imagem'), { params: Promise.resolve({ slug: 'natal' }) })
  expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('image/jpeg')
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes)
  expect(forward).toHaveBeenCalledWith({ method: 'GET', path: '/api/v1/public/affiliates/natal/preview-image', host: 'temlinkaqui.com', timeoutMs: 10000 })
  vi.mocked(forward).mockResolvedValue({ status: 404, headers: {}, body: Buffer.from('{}') })
  expect((await GET(new Request('https://temlinkaqui.com'), { params: Promise.resolve({ slug: 'natal' }) })).status).toBe(404)
})
