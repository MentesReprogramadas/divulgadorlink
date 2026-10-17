'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ActionIcon, type ActionIconName } from '@/components/ui/action-icon'
import { navigationIcons, type NavigationDestination } from '@/components/layout/navigation-icons'
import { SidebarLink } from '@/components/layout/sidebar-link'
import styles from './workspace.module.css'

type NavigationItem = { href: NavigationDestination; label: string }
type NavigationGroup = { label: string; items: NavigationItem[]; submenu?: { label: string; icon: ActionIconName; items: NavigationItem[] } }
const panelGroups: NavigationGroup[] = [
  { label: 'Seu espaço', items: [{ href: '/painel', label: 'Visão geral' }], submenu: { label: 'Publicação', icon: 'publish', items: [{ href: '/painel/links', label: 'Links' }, { href: '/painel/links/novo', label: 'Criar link' }, { href: '/painel/perfil', label: 'Minha página' }, { href: '/painel/convites', label: 'Convites' }] } },
  { label: 'Acompanhar', items: [{ href: '/painel/pedidos', label: 'Pedidos' }, { href: '/painel/lembretes', label: 'Lembretes' }, { href: '/painel/favoritos', label: 'Favoritos' }] },
  { label: 'Preferências', items: [{ href: '/painel/conta', label: 'Conta' }] },
]
const adminGroups: NavigationGroup[] = [
  { label: 'Operação', items: [{ href: '/admin/visao', label: 'Gestão' }], submenu: { label: 'Revisões', icon: 'reviews', items: [{ href: '/admin/moderacao', label: 'Moderação' }, { href: '/admin/denuncias', label: 'Denúncias' }, { href: '/admin/disponibilidade', label: 'Correções' }] } },
  { label: 'Comercial', items: [{ href: '/admin/planos', label: 'Planos' }, { href: '/admin/estornos', label: 'Estornos' }] },
  { label: 'Sistema', items: [{ href: '/admin/integracoes', label: 'Integrações' }, { href: '/admin/configuracoes', label: 'Configurações' }] },
]
export function WorkspaceNavigation({ area, role }: { area: 'panel' | 'admin'; role?: string }) {
  const path = usePathname()
  function itemLink(item: NavigationItem) {
    return <SidebarLink key={item.href} href={item.href} active={path === item.href || item.href === '/painel' && path === '/painel/visao'}>
      <ActionIcon name={navigationIcons[item.href]} width={19} height={19} strokeWidth={1.6} />{item.label}
    </SidebarLink>
  }
  return <nav className={styles.navigation} aria-label={area === 'admin' ? 'Admin' : 'Áreas do painel'}>
    {role === 'ADMIN' ? <div className={styles.areaLinks}><Link href="/painel" data-active={area === 'panel' || undefined}>Meu painel</Link><Link href="/admin/visao" data-active={area === 'admin' || undefined}>Administração</Link></div> : null}
    {(area === 'admin' ? adminGroups : panelGroups).map(group => <div className={styles.navGroup} key={group.label}>
      <p className={styles.groupLabel}>{group.label}</p>
      {group.items.map(itemLink)}
      {group.submenu ? <details className={styles.submenu} open={group.submenu.items.some(item => path === item.href || path.startsWith(item.href + '/'))} key={group.submenu.label + path}>
        <summary><ActionIcon name={group.submenu.icon} width={19} height={19} strokeWidth={1.6} /><span>{group.submenu.label}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
        <div className={styles.subitems}>{group.submenu.items.map(itemLink)}</div>
      </details> : null}
    </div>)}
  </nav>
}
