import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminLinksBoard, type AdminLinkRow } from './admin-links-board'

vi.mock('./link-promotion-editor', () => ({ LinkPromotionEditor: () => <button>Gerenciar destaque</button> }))
afterEach(cleanup)
const counts = { PUBLISHED: 45, PENDING_MODERATION: 2, PRE_REJECTED: 1, DRAFT: 3, UNAVAILABLE: 4 }
const links: AdminLinkRow[] = (['PUBLISHED', 'PENDING_MODERATION', 'PRE_REJECTED', 'DRAFT', 'UNAVAILABLE'] as const).map(status => ({ id: status, status, name: status, url: 'https://example.com', ownerName: 'Dona', ownerEmail: 'dona@example.com' }))
describe('links na gestão', () => {
  it('exibe totais reais e seleciona o status, sem contar só os cards carregados', () => {
    const onFilterChange = vi.fn()
    render(<AdminLinksBoard links={links} counts={counts} filter="ALL" onFilterChange={onFilterChange} onWithdraw={vi.fn()} loading={false} query="" />)
    expect(screen.getByRole('button', { name: 'Todos 55' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Publicados 45' }))
    expect(onFilterChange).toHaveBeenCalledWith('PUBLISHED')
    expect(screen.getByRole('status').textContent).toContain('Mostrando 5 de 55')
  })
  it('destaca o status por texto e oferece ações coerentes em cada card', () => {
    const withdraw = vi.fn()
    render(<AdminLinksBoard links={links} counts={counts} filter="ALL" onFilterChange={vi.fn()} onWithdraw={withdraw} loading={false} query="" />)
    const card = (name: string) => within(screen.getByRole('article', { name }))
    expect(card('PUBLISHED').getByLabelText('Status: Publicado')).toBeTruthy()
    expect(card('PUBLISHED').getByRole('button', { name: 'Gerenciar destaque' })).toBeTruthy()
    expect(card('PUBLISHED').getByRole('link', { name: 'Ver no catálogo' }).getAttribute('href')).toBe('/link/PUBLISHED')
    expect(card('PENDING_MODERATION').getByRole('link', { name: 'Revisar envio' }).getAttribute('href')).toBe('/admin/moderacao?link=PENDING_MODERATION')
    fireEvent.click(card('PRE_REJECTED').getByRole('button', { name: 'Retirar envio' }))
    expect(withdraw).toHaveBeenCalledWith(links[2])
    expect(card('DRAFT').queryByRole('button')).toBeNull()
    expect(card('UNAVAILABLE').queryByRole('button')).toBeNull()
    expect(card('PENDING_MODERATION').queryByRole('button', { name: 'Gerenciar destaque' })).toBeNull()
  })
  it('mostra vazio e mantém contagens dos demais status; esconde ações durante a busca', () => {
    const props = { links: [], counts, filter: 'UNAVAILABLE' as const, onFilterChange: vi.fn(), onWithdraw: vi.fn(), loading: false, query: 'grupo' }
    const view = render(<AdminLinksBoard {...props} />)
    expect(screen.getByText('Nenhum link encontrado neste status para esta busca.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fora do ar 4' }).getAttribute('aria-pressed')).toBe('true')
    view.rerender(<AdminLinksBoard {...props} links={links} loading />)
    expect(screen.queryByRole('article')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Carregando links…')
  })
})
