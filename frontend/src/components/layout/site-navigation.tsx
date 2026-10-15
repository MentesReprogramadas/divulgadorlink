'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { accountLinks } from '@/domain/account-nav'
import styles from './site-shell.module.css'

const ICONS: Record<string, string> = {
  '/busca': 'm16 16 4 4M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z',
  '/login': 'M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M4 12h11m-4-4 4 4-4 4',
  '/cadastro': 'M15 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m6-10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10-1v6m-3-3h6',
  '/painel': 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  '/admin/visao': 'm12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Zm-4 9 3 3 5-6',
}

function NavigationIcon({ path }: { path: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={ICONS[path]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SiteNavigation({ role }: { role?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const items = [{ href: '/busca', label: 'Busca' }, ...accountLinks(role)]

  return (
    <div className={styles.navigation} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        toggle.current?.focus()
      }
    }}>
      <button ref={toggle} type="button" className={styles.menuToggle} aria-controls="site-navigation" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={open ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        Menu
      </button>
      <nav id="site-navigation" className={`${styles.nav} ${open ? styles.navOpen : ''}`} aria-label="Navegação principal">
        {items.map((item) => {
          const active = item.href === '/admin/visao' ? pathname.startsWith('/admin') : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const primary = item.href === '/cadastro' || item.href === '/painel'
          return (
            <a key={item.href} href={item.href} className={primary ? styles.navPrimary : undefined} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
              <NavigationIcon path={item.href} />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>
    </div>
  )
}
