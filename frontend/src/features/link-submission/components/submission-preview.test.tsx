import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SubmissionPreview } from './submission-preview'

vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => <span aria-hidden="true" /> }))
afterEach(cleanup)
const draft = { name: 'Clube de leitura', description: 'Livros e conversas para compartilhar.', url: 'https://example.com/leitura', niche: { name: 'Literatura', slug: 'literatura' }, network: { name: 'Site', slug: 'site' } }

it('mostra o card sem uma área de imagem quando não há anexo', () => {
  render(<SubmissionPreview {...draft} media={{}} />)
  const card = within(screen.getByRole('article'))
  expect(card.getByRole('heading', { name: draft.name })).toBeTruthy()
  expect(card.getByText(draft.description)).toBeTruthy()
  expect(card.getByText('Literatura')).toBeTruthy()
  expect(card.queryByRole('img')).toBeNull()
  expect(card.queryByRole('link')).toBeNull()
})

it('reutiliza os anexos preparados sem enviar ou criar destino para o rascunho', () => {
  render(<SubmissionPreview {...draft} media={{ icon: { base64: 'aWNvbg==' }, image: { base64: 'Y292ZXI=', alt: 'Leitores reunidos' } }} />)
  const article = screen.getByRole('article')
  expect(article.querySelectorAll('img')).toHaveLength(2)
  expect(screen.getByRole('img', { name: 'Leitores reunidos' }).getAttribute('src')).toBe('data:image/webp;base64,Y292ZXI=')
  expect(article.querySelector('a')).toBeNull()
  expect(article.querySelector('[data-preview]')).toBeNull()
  expect(article.getAttribute('data-preview')).toBe('true')
  expect(screen.getByText(/só aparecerão publicamente após aprovação/)).toBeTruthy()
})
