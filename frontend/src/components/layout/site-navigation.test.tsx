import { renderToString } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteNavigation } from './site-navigation'
import { WorkspaceNavigation } from '@/features/account/components/workspace-navigation'

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn(() => '/') }))
vi.mock('next/navigation', () => ({ usePathname: pathname }))
afterEach(() => { cleanup(); pathname.mockReturnValue('/') })

it('F16 keeps Minha página selected for models/history without selecting an unrelated navigation destination',()=>{
  pathname.mockReturnValue('/painel/perfil/modelos');const view=render(<WorkspaceNavigation area="panel" role="USER"/>);expect(screen.getByRole('link',{name:'Minha página'}).getAttribute('aria-current')).toBe('location');expect(screen.getByRole('link',{name:'Links'}).getAttribute('aria-current')).toBeNull()
  pathname.mockReturnValue('/painel/perfil/historico');view.rerender(<WorkspaceNavigation area="panel" role="USER"/>);expect(screen.getByRole('link',{name:'Minha página'}).getAttribute('aria-current')).toBe('location');expect(view.container.querySelectorAll('[aria-current]').length).toBe(1)
})

describe('navegação principal', () => {
  it('preserva os destinos públicos e acompanha cada rótulo com ícone decorativo', () => {
    render(<SiteNavigation />)
    const links = within(screen.getByRole('navigation', { name: 'Navegação principal' })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/busca', '/login', '/cadastro'])
    for (const link of links) expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull()
  })

  it('oferece saída no cabeçalho e como última ação da sidebar, inclusive na verificação', () => {
    pathname.mockReturnValue('/painel/verificar')
    render(<SiteNavigation role="USER" />)
    expect(within(screen.getByRole('navigation', { name: 'Navegação principal' })).getByRole('button', { name: 'Sair' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const drawer = screen.getByRole('dialog')
    const buttons = within(drawer).getAllByRole('button')
    expect(buttons.at(-1)?.textContent).toBe('Sair')
    expect(within(drawer).queryByRole('navigation', { name: 'Áreas do painel' })).toBeNull()
  })

  it('organiza os destinos do site antes do contexto e das seções do administrador', () => {
    pathname.mockReturnValue('/admin/visao')
    render(<SiteNavigation role="ADMIN" />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const drawer = screen.getByRole('dialog')
    const site = within(drawer).getByRole('navigation', { name: 'Navegação do site' })
    expect(within(site).getAllByRole('link').map(link => link.textContent)).toEqual(['Catálogo', 'Busca', 'Painel', 'Admin'])
    for (const link of within(site).getAllByRole('link')) expect(link.querySelector('svg')).toBeTruthy()
    const workspace = within(drawer).getByRole('navigation', { name: 'Admin' })
    expect(site.compareDocumentPosition(workspace) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(drawer).getAllByRole('button').at(-1)?.textContent).toBe('Sair')
  })

  it('abre o menu e fecha com Escape devolvendo o foco', () => {
    render(<SiteNavigation />)
    const toggle = screen.getByRole('button', { name: 'Menu' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
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
    const drawerLink = within(screen.getByRole('dialog')).getByRole('link', { name: 'Busca' })
    drawerLink.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(drawerLink)
    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded')).toBe('false')
  })
})

it('W06 server HTML keeps the menu unavailable until its client handler and mount effects are ready', () => {
  const template = document.createElement('template')
  template.innerHTML = renderToString(<SiteNavigation role="USER" />)
  expect(template.content.querySelector('button[aria-label="Menu"]')?.hasAttribute('disabled')).toBe(true)
  render(<SiteNavigation role="USER" />)
  const toggle = screen.getByRole('button', { name: 'Menu' }) as HTMLButtonElement
  expect(toggle.disabled).toBe(false); fireEvent.click(toggle)
  expect(screen.getByRole('dialog')).toBeTruthy()
})
