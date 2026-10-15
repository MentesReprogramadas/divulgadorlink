import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteNavigation } from './site-navigation'

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn(() => '/') }))
vi.mock('next/navigation', () => ({ usePathname: pathname }))
afterEach(() => { cleanup(); pathname.mockReturnValue('/') })

describe('navegação principal', () => {
  it('preserva os destinos públicos e acompanha cada rótulo com ícone decorativo', () => {
    render(<SiteNavigation />)
    const links = within(screen.getByRole('navigation', { name: 'Navegação principal' })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/busca', '/login', '/cadastro'])
    for (const link of links) expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('abre o menu e fecha com Escape devolvendo o foco', () => {
    render(<SiteNavigation />)
    const toggle = screen.getByRole('button', { name: 'Menu' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toBe(screen.getByRole('navigation').id)
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    screen.getByRole('link', { name: 'Busca' }).focus()
    fireEvent.keyDown(screen.getByRole('link', { name: 'Busca' }), { key: 'Escape' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })

  it('destaca o painel nas suas subrotas, sem apresentar administração ao usuário', () => {
    pathname.mockReturnValue('/painel/links')
    render(<SiteNavigation role="USER" />)
    expect(screen.getByRole('link', { name: 'Painel' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('preserva os destinos do administrador e fecha ao escolher um item', () => {
    pathname.mockReturnValue('/admin/moderacao')
    render(<SiteNavigation role="ADMIN" />)
    expect(screen.getByRole('link', { name: 'Admin' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Painel' }).getAttribute('href')).toBe('/painel')
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    screen.getByRole('link', { name: 'Busca' }).addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(screen.getByRole('link', { name: 'Busca' }))
    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded')).toBe('false')
  })
})
