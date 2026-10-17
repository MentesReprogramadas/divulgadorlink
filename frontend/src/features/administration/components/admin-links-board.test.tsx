import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminLinksBoard, type AdminLinkRow } from './admin-links-board'

vi.mock('./link-promotion-editor', () => ({ LinkPromotionEditor: () => <button>Gerenciar destaque</button> }))
afterEach(cleanup)

const links: AdminLinkRow[] = (['PUBLISHED', 'PENDING_MODERATION', 'PRE_REJECTED', 'DRAFT', 'UNAVAILABLE'] as const).map(status => ({ id: status, status, name: status, url: 'https://example.com', ownerName: 'Dona', ownerEmail: 'dona@example.com' }))
describe('links na gestão', () => {
  it('destaca o status por texto e oferece ações coerentes em cada card', () => {
    const withdraw = vi.fn()
    render(<AdminLinksBoard links={links} onWithdraw={withdraw} loading={false} />)
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
  it('mostra vazio e mantém os cards carregados durante atualização, bloqueando retirada', () => {
    const props = { links: [], onWithdraw: vi.fn(), loading: false }
    const view = render(<AdminLinksBoard {...props} />)
    expect(screen.getByText('Nada por aqui ainda.')).toBeTruthy()

    view.rerender(<AdminLinksBoard {...props} links={links} loading />)
    expect(screen.getAllByRole('article')).toHaveLength(links.length)
    expect(screen.queryByRole('status')).toBeNull()
    for (const button of screen.getAllByRole('button', { name: /Tirar do ar|Retirar envio/ })) expect((button as HTMLButtonElement).disabled).toBe(true)
  })
})
