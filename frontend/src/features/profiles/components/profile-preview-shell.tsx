import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './profile-preview.module.css'

export function ProfilePreviewShell({ children, controls }: { children: ReactNode; controls?: ReactNode }) {
  return <main className={styles.page}>
    <section className={styles.banner} aria-label="Modo de prévia"><div className={styles.bannerInner}><div><strong>Modo de prévia</strong><p>Somente você vê este rascunho.</p></div><ButtonLink href="/painel/perfil"><ActionIcon name="back" />Voltar à edição</ButtonLink>{controls}</div></section>
    <div className={styles.content}>{children}</div>
  </main>
}
