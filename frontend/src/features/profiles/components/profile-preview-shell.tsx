import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './profile-preview.module.css'

export function ProfilePreviewShell({ children, controls, backHref='/painel/perfil', backLabel='Voltar à edição' }: { children: ReactNode; controls?: ReactNode;backHref?:string;backLabel?:string }) {
  return <main className={styles.page}>
    <section className={styles.banner} aria-label="Modo de prévia"><div className={styles.bannerInner}><div><strong>Modo de prévia</strong><p>Somente você vê este rascunho.</p></div><ButtonLink href={backHref}><ActionIcon name="back" />{backLabel}</ButtonLink>{controls}</div></section>
    <div className={styles.content}>{children}</div>
  </main>
}
