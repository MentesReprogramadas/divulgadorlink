import type { ReactNode } from 'react'
import { SiteNavigation } from './site-navigation'
import { CookieSettings } from '@/components/domain/consent'
import styles from './site-shell.module.css'

export function SiteShell({ role, children }: { role?: string; children: ReactNode }) {
  return (
    <>
      <a className={styles.skip} href="#main-content">Ir para o conteúdo</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" aria-label="Home">
            <img src="/logo.svg" alt="" width={1292} height={235} />
          </a>
          <SiteNavigation role={role} />
        </div>
      </header>
      <div id="main-content" className={styles.content} tabIndex={-1}>{children}</div>
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Tem Link Aqui</span>
        <nav aria-label="Informações do site"><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a><CookieSettings /></nav>
      </footer>
    </>
  )
}
