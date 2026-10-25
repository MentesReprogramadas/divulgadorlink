import { renderToString } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteNavigation } from './site-navigation'
import { WorkspaceNavigation } from '@/features/account/components/workspace-navigation'

const { pathname, workspaceAccess, push, guard } = vi.hoisted(() => ({ pathname: vi.fn(() => '/'), workspaceAccess: vi.fn(), push:vi.fn(), guard:vi.fn(async()=>{}) }))
vi.mock('@/features/workspace-team/workspace-access',async original=>({...await original<typeof import('@/features/workspace-team/workspace-access')>(),useWorkspaceAccess:()=>workspaceAccess()??({ready:true,context:{ownerId:null,grants:null},error:''})}))
vi.mock('next/navigation', () => ({ usePathname: pathname, useRouter:()=>({push}) }))
vi.mock('@/lib/workspace-switch-guards',()=>({prepareWorkspaceSwitch:guard}))
vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
afterEach(() => { cleanup(); pathname.mockReturnValue('/'); workspaceAccess.mockReset();push.mockReset();guard.mockReset();guard.mockResolvedValue(undefined) })

it('não expõe destinos de edição ou divulgação sem permissão dentro das subseções',()=>{
 workspaceAccess.mockReturnValue({ready:true,context:{ownerId:'shared-owner',grants:{page:{read:true,write:false}}},error:''});pathname.mockReturnValue('/painel/perfil');render(<WorkspaceNavigation area="panel"/>);
 expect(screen.queryByRole('link',{name:'Apresentação',hidden:true})).toBeNull();expect(screen.queryByRole('link',{name:'Aparência',hidden:true})).toBeNull();expect(screen.queryByRole('link',{name:'Importar links',hidden:true})).toBeNull();expect(screen.queryByRole('link',{name:'Campanhas',hidden:true})).toBeNull();expect(screen.queryByRole('link',{name:'Contatos recebidos',hidden:true})).toBeNull();expect(screen.queryByRole('link',{name:'Apresentação para parceiros',hidden:true})).toBeNull();expect(screen.getByRole('link',{name:'Criar imagem',hidden:true})).toBeTruthy()
})

it('seleciona a área pela rota e abre somente seu grupo ativo',()=>{
 pathname.mockReturnValue('/painel/perfil/modelos');const view=render(<WorkspaceNavigation area="panel"/>);expect(screen.getByRole('link',{name:'Modelos'}).getAttribute('aria-current')).toBe('page');expect(screen.getByLabelText('Área do painel').textContent).toContain('Minha página');expect(screen.getByText('Editar página').closest('details')?.open).toBe(true);expect(screen.queryByRole('link',{name:'Links permanentes',hidden:true})).toBeNull();expect(view.container.querySelector('details details')).toBeNull();expect(view.container.querySelectorAll('details[open]')).toHaveLength(1)
 pathname.mockReturnValue('/painel/perfil/historico');view.rerender(<WorkspaceNavigation area="panel"/>);expect(screen.getByRole('link',{name:'Histórico de versões'}).getAttribute('aria-current')).toBe('page');expect(screen.getByText('Ferramentas').closest('details')?.open).toBe(true);expect(view.container.querySelectorAll('[aria-current]')).toHaveLength(1)
})
it('troca de contexto passa pela proteção de rascunho e mantém a área quando salvar falha',async()=>{
 const user=userEvent.setup();pathname.mockReturnValue('/painel/perfil');render(<WorkspaceNavigation area="panel"/>);guard.mockRejectedValueOnce(new Error('Salve o rascunho antes de sair.'));await user.click(screen.getByLabelText('Área do painel'));await user.click(await screen.findByRole('option',{name:'Meus links'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Salve o rascunho antes de sair.');expect(push).not.toHaveBeenCalled();expect(screen.getByLabelText('Área do painel').textContent).toContain('Minha página');await waitFor(()=>expect(screen.getByLabelText('Área do painel').hasAttribute('disabled')).toBe(false));await user.click(screen.getByLabelText('Área do painel'));await user.click(await screen.findByRole('option',{name:'Meus links'}));expect(guard).toHaveBeenCalledTimes(2);expect(push).toHaveBeenCalledWith('/painel')
})
it('mantém conta/equipe nos três contextos e não mistura suas ferramentas',()=>{
 pathname.mockReturnValue('/painel/convites');const view=render(<WorkspaceNavigation area="panel"/>);expect(screen.getByRole('link',{name:'Links permanentes'}).getAttribute('aria-current')).toBe('page');expect(screen.queryByText('Editar página')).toBeNull();expect(screen.queryByRole('link',{name:'Criar link',hidden:true})).toBeNull();expect(screen.getByRole('link',{name:'Equipe e permissões'})).toBeTruthy();expect(screen.getByText('Minha conta')).toBeTruthy();pathname.mockReturnValue('/painel/clientes/acessos');view.rerender(<WorkspaceNavigation area="panel"/>);expect(screen.getByRole('link',{name:'Acessos por página'}).getAttribute('aria-current')).toBe('page');expect(screen.queryByRole('link',{name:'Links permanentes',hidden:true})).toBeNull();expect(screen.getByRole('link',{name:'Equipe e permissões'})).toBeTruthy()
})
it('não oferece contexto nem destino sem permissão e não mostra links antes de conferir acesso',()=>{
 workspaceAccess.mockReturnValue({ready:true,context:{ownerId:'owner',grants:{invitations:{read:true,write:false}}},error:''});pathname.mockReturnValue('/painel/convites');const view=render(<WorkspaceNavigation area="panel"/>);expect(screen.getByRole('link',{name:'Links permanentes'})).toBeTruthy();expect(screen.queryByRole('link',{name:'Links no catálogo'})).toBeNull();expect(screen.queryByText('Editar página')).toBeNull();workspaceAccess.mockReturnValue({ready:false,context:null,error:''});view.rerender(<WorkspaceNavigation area="panel"/>);expect(screen.queryByRole('navigation',{name:'Áreas do painel'})).toBeNull();expect(screen.getByLabelText('Carregando navegação')).toBeTruthy()
})

it('uma permissão de relatórios não cria acesso visual à área de links',async()=>{
 workspaceAccess.mockReturnValue({ready:true,context:{ownerId:'owner',grants:{reports:{read:true,write:false}}},error:''});pathname.mockReturnValue('/painel/perfil/metricas');render(<WorkspaceNavigation area="panel"/>);expect(screen.getByRole('link',{name:'Visitas e cliques'})).toBeTruthy();const user=userEvent.setup();await user.click(screen.getByLabelText('Área do painel'));expect(await screen.findByRole('option',{name:'Minha página'})).toBeTruthy();expect(screen.queryByRole('option',{name:'Meus links'})).toBeNull();expect(screen.queryByRole('option',{name:'Outras páginas'})).toBeNull()
})

it('usa Meus links como padrão de conta e como primeira opção, sem trocar a área de uma rota direta',async()=>{
 pathname.mockReturnValue('/painel/conta');render(<WorkspaceNavigation area="panel"/>);expect(screen.getByLabelText('Área do painel').textContent).toContain('Meus links');const user=userEvent.setup();await user.click(screen.getByLabelText('Área do painel'));expect((await screen.findAllByRole('option')).map(option=>option.textContent?.replace('✓',''))).toEqual(['Meus links','Minha página','Outras páginas'])
})

describe('navegação principal', () => {
  it('preserva os destinos públicos e acompanha cada rótulo com ícone decorativo', () => {
    render(<SiteNavigation />)
    const links = within(screen.getByRole('navigation', { name: 'Navegação principal' })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/busca', '/paginas', '/login', '/cadastro'])
    const icons = links.map(link => link.querySelector(':scope > svg'))
    for (const icon of icons) expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(new Set(icons.map(icon => icon?.querySelector('path')?.getAttribute('d'))).size).toBe(links.length)
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
    expect(within(site).getAllByRole('link').map(link => link.textContent)).toEqual(['Catálogo', 'Busca', 'Páginas', 'Painel', 'Admin'])
    for (const link of within(site).getAllByRole('link')) expect(link.querySelector(':scope > svg')?.getAttribute('aria-hidden')).toBe('true')
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
