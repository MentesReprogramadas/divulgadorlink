'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { SiteNavigation } from './site-navigation'
import { CookieSettings } from '@/components/domain/consent'
import styles from './site-shell.module.css'
import { SupportBanner } from '@/features/support/support-banner'

export function SiteShell({ role, support = false, children }: { role?: string; support?: boolean; children: ReactNode }) {
  const pathname = usePathname()
  if (/^\/p\/[^/]+(?:\/canais\/estado)?\/?$/.test(pathname) || pathname === '/painel/perfil/previa') return <>{support ? <SupportBanner /> : null}{children}</>
  return (
    <>
      <a className={styles.skip} href="#main-content">Ir para o conteúdo</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" aria-label="Home">
            <img src="/logo.svg" alt="" width={1292} height={235} />
          </a>
          <SiteNavigation role={role} support={support} />
        </div>
      </header>
      {support ? <SupportBanner /> : null}
      <div id="main-content" className={styles.content} tabIndex={-1}>{children}</div>
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Tem Link Aqui</span>
        <nav aria-label="Informações do site"><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a><CookieSettings /></nav>
      </footer>
    </>
  )
}
