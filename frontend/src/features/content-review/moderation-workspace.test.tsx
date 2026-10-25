import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ModerationWorkspace } from './moderation-workspace'

vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => <span aria-hidden="true" /> }))
vi.mock('./admin-review-queue', () => ({ AdminContentReviewQueue: ({ kind }: { kind: string }) => <p>Análise de {kind}</p> }))
vi.mock('@/features/link-media/link-media-queue', () => ({ LinkMediaQueue: ({ linkId }: { linkId?: string }) => <section aria-label="Análise de anexos">Anexos de {linkId}</section> }))
afterEach(cleanup)
function LinksFixture() { return <section>Fila de texto</section> }

it('separa anexos de texto numa aba própria e preserva o filtro de link', async () => {
  render(<ModerationWorkspace links={<LinksFixture />} linkId="link-filtered" />)
  expect(screen.getByText('Fila de texto')).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Análise de anexos' })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Anexos' }))
  expect(await screen.findByRole('region', { name: 'Análise de anexos' })).toHaveProperty('textContent', 'Anexos de link-filtered')
  expect(screen.queryByText('Fila de texto')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Links' }))
  expect(await screen.findByText('Fila de texto')).toBeTruthy()
})
