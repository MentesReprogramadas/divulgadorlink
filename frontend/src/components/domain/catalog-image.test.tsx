import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CatalogImage } from './catalog-image'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('recupera falha da imagem já concluída antes da hidratação, sem esperar outro evento error', () => {
  vi.spyOn(HTMLImageElement.prototype, 'currentSrc', 'get').mockReturnValue('http://localhost/bff/media/cover')
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0)
  render(<CatalogImage src="/api/media/cover" alt="Capa aprovada" className="image" eager fallback={<span>Sem foto</span>} />)
  expect(screen.getByText('Sem foto')).toBeTruthy()
  expect(screen.queryByAltText('Capa aprovada')).toBeNull()
})

it('preserva lazy ainda não iniciado mesmo quando complete é true e naturalWidth é zero', () => {
  vi.spyOn(HTMLImageElement.prototype, 'currentSrc', 'get').mockReturnValue('')
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0)
  render(<CatalogImage src="/api/media/cover" alt="Capa pendente" className="image" fallback={<span>Sem foto</span>} />)
  expect(screen.getByAltText('Capa pendente')).toBeTruthy()
  expect(screen.queryByText('Sem foto')).toBeNull()
  fireEvent.error(screen.getByAltText('Capa pendente'))
  expect(screen.getByText('Sem foto')).toBeTruthy()
})

it('mantém imagem em carregamento e imagem concluída com largura natural válida', () => {
  vi.spyOn(HTMLImageElement.prototype, 'currentSrc', 'get').mockReturnValue('http://localhost/bff/media/cover')
  const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
  const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0)
  const { rerender } = render(<CatalogImage src="/api/media/cover" alt="Capa carregando" className="image" fallback={<span>Sem foto</span>} />)
  expect(screen.getByAltText('Capa carregando')).toBeTruthy()
  complete.mockReturnValue(true); width.mockReturnValue(960)
  rerender(<CatalogImage src="/api/media/loaded" alt="Capa carregada" className="image" fallback={<span>Sem foto</span>} />)
  expect(screen.getByAltText('Capa carregada')).toBeTruthy()
  expect(screen.queryByText('Sem foto')).toBeNull()
})
it('usa fallback opcional na ausência ou falha e recupera com outra imagem; o padrão continua sem slot', () => {
  const { container, rerender } = render(<CatalogImage className="image" fallback={<span>CL</span>} />)
  expect(screen.getByText('CL')).toBeTruthy()
  rerender(<CatalogImage src="/api/media/icon" alt="Ícone aprovado" className="image" fallback={<span>CL</span>} />)
  expect(screen.getByAltText('Ícone aprovado').getAttribute('src')).toBe('/bff/media/icon')
  expect(screen.queryByText('CL')).toBeNull()
  fireEvent.error(screen.getByAltText('Ícone aprovado'))
  expect(screen.getByText('CL')).toBeTruthy()
  rerender(<CatalogImage src="/api/media/icon" className="image" />)
  expect(container.childElementCount).toBe(0)
  rerender(<CatalogImage src="/api/media/replacement" alt="Novo ícone" className="image" />)
  expect(screen.getByAltText('Novo ícone').getAttribute('src')).toBe('/bff/media/replacement')
})

it('oferece larguras públicas locais e mantém carregamento, descrição e fallback', () => {
  const { rerender } = render(<CatalogImage src="/api/v1/links/community/media/approved" alt="Foto da comunidade" className="image" sizes="(max-width: 600px) 100vw, 400px" fallback={<span>Sem foto</span>} />)
  const image = screen.getByAltText('Foto da comunidade')
  expect(image.getAttribute('srcset')).toBe([320, 640, 960, 1280, 1600].map(width => `/bff/v1/links/community/media/approved?width=${width} ${width}w`).join(', '))
  expect(image.getAttribute('sizes')).toBe('(max-width: 600px) 100vw, 400px')
  expect(image.getAttribute('loading')).toBe('lazy')
  expect(image.getAttribute('decoding')).toBe('async')
  fireEvent.error(image)
  expect(screen.getByText('Sem foto')).toBeTruthy()
  rerender(<CatalogImage src="/api/v1/links/community/media/replacement" alt="Nova foto" className="image" sizes="400px" eager />)
  expect(screen.getByAltText('Nova foto').getAttribute('srcset')).toContain('replacement?width=320')
  expect(screen.getByAltText('Nova foto').getAttribute('loading')).toBe('eager')
  expect(screen.getByAltText('Nova foto').getAttribute('fetchpriority')).toBe('high')
})

it('restringe variantes de ícone e não transforma prévias, URLs externas ou mídia privada', () => {
  const { rerender } = render(<CatalogImage src="/api/v1/links/community/media/icon" kind="icon" className="icon" sizes="32px" />)
  expect(screen.getByRole('presentation').getAttribute('srcset')).toBe('/bff/v1/links/community/media/icon?width=64 64w, /bff/v1/links/community/media/icon?width=128 128w')
  for (const src of ['data:image/webp;base64,ZGVtbw==', 'https://images.test/photo.webp', '/api/v1/links/community/media/private/pending', '/api/v1/admin/moderation/media/pending/bytes', '/api/v1/links/community/media/approved?download=1']) {
    rerender(<CatalogImage src={src} className="image" sizes="400px" />)
    expect(screen.getByRole('presentation').hasAttribute('srcset')).toBe(false)
    expect(screen.getByRole('presentation').hasAttribute('sizes')).toBe(false)
  }
})
