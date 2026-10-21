'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {useWorkspaceAccess,hasWorkspaceAdmin,workspaceAdminPath} from '@/features/workspace-team/workspace-access'
import { accountLinks } from '@/domain/account-nav'
import { WorkspaceNavigation } from '@/features/account/components/workspace-navigation'
import { LogoutButton } from '@/features/account/components/logout-button'
import { readSession, SESSION_EVENT } from '@/domain/session'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { ActionIcon } from '@/components/ui/action-icon'
import { navigationIcons, type NavigationDestination } from './navigation-icons'
import { SidebarLink } from './sidebar-link'
import styles from './site-shell.module.css'

export function SiteNavigation({ role, support = false }: { role?: string; support?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [sessionRole, setSessionRole] = useState(role)
  const toggle = useRef<HTMLButtonElement>(null)
  const access=useWorkspaceAccess(sessionRole==='USER'||sessionRole==='ADMIN')
  const effectiveRole=hasWorkspaceAdmin(access.context)?'ADMIN':sessionRole
  const items = [{ href: '/busca', label: 'Busca' }, { href:'/paginas',label:'Páginas' }, ...accountLinks(effectiveRole)].map(item=>item.href==='/admin/visao'&&access.context?.ownerId?{...item,href:workspaceAdminPath(access.context)}:item).filter(item=>item.href!=='/admin/visao'||!access.context?.ownerId||hasWorkspaceAdmin(access.context))
  const signedIn = sessionRole === 'USER' || sessionRole === 'ADMIN'
  const workspace = pathname.startsWith('/admin') ? 'admin' : 'panel'
  const showWorkspace = signedIn && (pathname.startsWith('/painel') || pathname.startsWith('/admin') && effectiveRole === 'ADMIN') && pathname !== '/painel/verificar'
  function close() { setOpen(false); toggle.current?.focus() }
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    function sync() { setSessionRole(readSession()?.role ?? role) }
    sync()
    window.addEventListener(SESSION_EVENT, sync)
    return () => window.removeEventListener(SESSION_EVENT, sync)
  }, [role])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)')
    function resize() { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', resize)
    return () => desktop.removeEventListener('change', resize)
  }, [])

  return (
    <div className={styles.navigation}>
      <button ref={toggle} type="button" disabled={!ready} aria-busy={!ready || undefined} className={styles.menuToggle} aria-label="Menu" aria-controls="mobile-navigation" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={open ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
      <nav id="site-navigation" className={styles.nav} aria-label="Navegação principal">
        {items.map((item) => {
          const active = item.href === '/admin/visao' ? pathname.startsWith('/admin') : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const primary = item.href === '/cadastro' || item.href === '/painel'
          return (
            <a key={item.href} href={item.href} className={primary ? styles.navPrimary : undefined} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
              <ActionIcon name={navigationIcons[item.href as NavigationDestination]} strokeWidth={1.7} />
              <span>{item.label}</span>
            </a>
          )
        })}
        {signedIn && !support ? <LogoutButton /> : null}
      </nav>
      <OverlayDialog open={open} title={showWorkspace ? workspace === 'admin' ? 'Administração' : 'Meu espaço' : 'Menu'} onClose={close} variant="sidebar">
        <div id="mobile-navigation" className={styles.drawerContent} onClick={event => { if ((event.target as HTMLElement).closest('a')) close() }}>
          <nav className={styles.drawerLinks} data-columns={pathname.startsWith('/painel') || pathname.startsWith('/admin') ? 2 : 1} aria-label="Navegação do site">
            {[{ href: '/', label: 'Catálogo' }, ...items].map(item => <SidebarLink key={item.href} href={item.href} active={pathname === item.href}><ActionIcon name={navigationIcons[item.href as NavigationDestination]} strokeWidth={1.7} />{item.label}</SidebarLink>)}
          </nav>
          {showWorkspace ? <WorkspaceNavigation area={workspace} role={effectiveRole} /> : null}
          <div className={styles.drawerFooter}>
            {signedIn && !support ? <LogoutButton /> : null}
          </div>
        </div>
      </OverlayDialog>
    </div>
  )
}
