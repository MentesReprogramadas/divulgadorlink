'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ActionIcon, type ActionIconName } from '@/components/ui/action-icon'
import { navigationIcons, type NavigationDestination } from '@/components/layout/navigation-icons'
import { SidebarLink } from '@/components/layout/sidebar-link'
import styles from './workspace.module.css'
import {useWorkspaceAccess,workspaceVisible,hasWorkspaceAdmin,workspaceAdminPath} from '@/features/workspace-team/workspace-access'

type NavigationItem = { href: NavigationDestination; label: string }
type NavigationSection = { label: string; items: NavigationItem[] }
type NavigationSubmenu = NavigationSection & { icon: ActionIconName; sections?: NavigationSection[] }
type NavigationGroup = { label: string; items: NavigationItem[]; submenu?: NavigationSubmenu }
const profileSections: NavigationSection[] = [
  { label: 'Edição', items: [{href:'/painel/perfil/dados',label:'Dados da página'},{href:'/painel/perfil/links',label:'Grupos e links'},{href:'/painel/perfil/aparencia',label:'Aparência'},{href:'/painel/perfil/idiomas',label:'Idiomas'},{href:'/painel/perfil/modelos',label:'Modelos'},{href:'/painel/perfil/endereco',label:'Endereço próprio'}] },
  { label: 'Ferramentas', items: [{href:'/painel/perfil/importar',label:'Importar links'},{href:'/painel/perfil/exportar',label:'Importar e exportar'},{href:'/painel/perfil/historico',label:'Histórico'},{href:'/painel/perfil/checklist',label:'Checklist'}] },
  { label: 'Resultados e divulgação', items: [{href:'/painel/perfil/testes',label:'Comparar botões'},{href:'/painel/perfil/metricas',label:'Métricas'},{href:'/painel/perfil/contatos',label:'Contatos recebidos'},{href:'/painel/perfil/campanhas',label:'Campanhas'},{href:'/painel/perfil/midia-kit',label:'Apresentação para parceiros'},{href:'/painel/perfil/divulgar',label:'Criar imagem de divulgação'}] },
]
function submenuItems(submenu?: NavigationSubmenu): NavigationItem[] {
  return submenu ? [...submenu.items, ...(submenu.sections ?? []).flatMap(section => section.items)] : []
}
function DisclosureArrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
}
const panelGroups: NavigationGroup[] = [
  {label:'Seu espaço',items:[{href:'/painel',label:'Visão geral'},{href:'/painel/convites',label:'Convites'},{href:'/painel/equipe',label:'Equipe'}]},
  {label:'Catálogo',items:[{href:'/painel/links',label:'Meus links'},{href:'/painel/links/novo',label:'Criar link'}]},
  {label:'Minha página',items:[],submenu:{label:'Minha página',icon:'profile',items:[{href:'/painel/perfil',label:'Visão geral'}],sections:profileSections}},
  {label:'Clientes',items:[],submenu:{label:'Clientes',icon:'clientPortfolio',items:[{href:'/painel/clientes',label:'Portfólio'}],sections:[{label:'Equipe e titularidade',items:[{href:'/painel/clientes/acessos',label:'Acessos por cliente'},{href:'/painel/clientes/transferencias',label:'Transferir página'}]}]}},
  {label:'Acompanhar',items:[{href:'/painel/pedidos',label:'Pedidos'},{href:'/painel/lembretes',label:'Lembretes'},{href:'/painel/favoritos',label:'Favoritos'},{href:'/painel/interesses',label:'Categorias seguidas'},{href:'/painel/integracoes',label:'Integrações e avisos'}]},
  {label:'Preferências',items:[{href:'/painel/assinatura',label:'Assinatura'},{href:'/painel/conta',label:'Conta'}]},
]
const adminGroups: NavigationGroup[] = [
  { label: 'Operação', items: [{ href: '/admin/visao', label: 'Gestão' }], submenu: { label: 'Revisões', icon: 'reviews', items: [{ href: '/admin/moderacao', label: 'Moderação' }, { href: '/admin/denuncias', label: 'Denúncias' }, { href: '/admin/disponibilidade', label: 'Correções' }] } },
  { label: 'Comercial', items: [{href:'/admin/destaques',label:'Destaques de links'},{ href: '/admin/planos', label: 'Destaques' }, { href: '/admin/assinaturas', label: 'Assinaturas' }, { href: '/admin/estornos', label: 'Estornos' }] },
  { label: 'Sistema', items: [{ href: '/admin/integracoes', label: 'Integrações' }, { href: '/admin/configuracoes', label: 'Configurações' }] },
]
export function WorkspaceNavigation({ area, role }: { area: 'panel' | 'admin'; role?: string }) {
  const path = usePathname()
  const access=useWorkspaceAccess()
  const visibleItem = (item: NavigationItem) => access.ready && workspaceVisible(access.context, item.href)
  const activeItem = (item: NavigationItem) => path === item.href || item.href.startsWith('/painel/perfil/') && path.startsWith(item.href + '/')
  function itemLink(item: NavigationItem) {
    if(!access.ready||!workspaceVisible(access.context,item.href))return null
    return <SidebarLink key={item.href} href={item.href} active={activeItem(item) && item.href !== '/painel' || item.href === '/painel' && (path === '/painel' || path === '/painel/visao')}>
      <ActionIcon name={navigationIcons[item.href]} width={19} height={19} strokeWidth={1.6} />{item.label}
    </SidebarLink>
  }
  return <nav className={styles.navigation} aria-label={area === 'admin' ? 'Admin' : 'Áreas do painel'}>
    {(role === 'ADMIN'&&!access.context?.ownerId||hasWorkspaceAdmin(access.context)) ? <div className={styles.areaLinks}><Link href="/painel" data-active={area === 'panel' || undefined}>Meu painel</Link><Link href={access.context?.ownerId?workspaceAdminPath(access.context):'/admin/visao'} data-active={area === 'admin' || undefined}>Administração</Link></div> : null}
    {(area === 'admin' ? adminGroups : panelGroups).filter(group=>[...group.items,...submenuItems(group.submenu)].some(visibleItem)).map(group => <div className={styles.navGroup} key={group.label}>
      {group.label!==group.submenu?.label?<p className={styles.groupLabel}>{group.label}</p>:null}
      {group.items.map(itemLink)}
      {group.submenu && submenuItems(group.submenu).some(visibleItem) ? <details className={styles.submenu} open={submenuItems(group.submenu).some(item => visibleItem(item) && activeItem(item))} key={group.submenu.label + path}>
        <summary><ActionIcon name={group.submenu.icon} width={19} height={19} strokeWidth={1.6} /><span>{group.submenu.label}</span><DisclosureArrow /></summary>
        <div className={styles.subitems}>
          {group.submenu.items.map(itemLink)}
          {group.submenu.sections?.filter(section => section.items.some(visibleItem)).map(section => <details className={`${styles.submenu} ${styles.subsection}`} key={section.label + path} open={section.items.some(item => visibleItem(item) && activeItem(item))}>
            <summary data-navigation-section><span>{section.label}</span><DisclosureArrow /></summary>
            <div className={styles.subitems}>{section.items.map(itemLink)}</div>
          </details>)}
        </div>
      </details> : null}
    </div>)}
  </nav>
}
