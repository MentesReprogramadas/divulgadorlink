'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { SiteNavigation } from './site-navigation'
import { CookieSettings } from '@/components/domain/consent'
import styles from './site-shell.module.css'
import { SupportBanner } from '@/features/support/support-banner'
import { OndasAtmosphere } from './ondas-atmosphere'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function SiteShell({ role, support = false, personalHost=false, children }: { role?: string; support?: boolean; personalHost?:boolean; children: ReactNode }) {
  const pathname = usePathname()
  const workspace = /^\/(painel|admin)(\/|$)/.test(pathname)
  const profilePreview=pathname==='/painel/perfil/previa'||/^\/painel\/equipe\/[^/]+\/previa$/.test(pathname)
  if (personalHost)return <div className={styles.personalFrame}>{children}</div>
  if (/^\/p\/[^/]+(?:\/canais\/estado|\/midia-kit|\/c\/[^/]+)?\/?$/.test(pathname) || profilePreview || pathname === '/painel/perfil/midia-kit/previa' || /^\/painel\/perfil\/campanhas\/[^/]+\/previa$/.test(pathname)) return <div data-profile-preview={profilePreview||undefined} className={[styles.personalFrame,profilePreview?styles.previewFrame:''].filter(Boolean).join(' ')}>{support ? <SupportBanner /> : null}{children}</div>
  return (
    <>
      {!pathname.startsWith('/dev/') ? <OndasAtmosphere /> : null}
      <a className={styles.skip} href="#main-content">Ir para o conteúdo</a>
      <header className={styles.header}>
        <LiquidLens radius={0} edge="none" />
        <div className={styles.headerInner} data-workspace={workspace || undefined}>
          <a className={styles.brand} href="/" aria-label="Home">
            <img src="/brand/ondas-logo.svg" alt="" width={1292} height={235} />
          </a>
          <div className={styles.headerActions}><SiteNavigation role={role} support={support} /></div>
        </div>
      </header>
      {support ? <SupportBanner /> : null}
      <div id="main-content" className={styles.content} tabIndex={-1}>{children}</div>
      <footer className={styles.footer} data-workspace={workspace || undefined}>
        <LiquidLens radius={0} edge="none" />
        <a className={styles.footerBrand} href="/" aria-label="Tem Link Aqui — voltar ao catálogo">
          <img src="/brand/confluencia/simbolo-escuro.svg" alt="" width={256} height={256} />
        </a>
        <nav aria-label="Informações do site"><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a><CookieSettings /><a className={styles.footerSocial} href="https://www.instagram.com/temlinkaquii/" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Tem Link Aqui (abre em nova aba)" title="@temlinkaquii"><span aria-hidden="true" className={styles.instagramIcon} /></a></nav>
      </footer>
    </>
  )
}
