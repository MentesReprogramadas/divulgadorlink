import type { CSSProperties, ReactNode } from 'react'
import {profileAppearance,readableInk,type ProfileAppearance} from '../profile-appearance'
import { ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import {LiquidLens} from '@/components/ui/liquid-lens'
import {OndasAtmosphere} from '@/components/layout/ondas-atmosphere'
import styles from './profile-preview.module.css'

export function ProfilePreviewShell({ children, controls, backHref='/painel/perfil', backLabel='Voltar à edição', variant='profile', appearance }: { children: ReactNode; controls?: ReactNode;backHref?:string;backLabel?:string;variant?:'profile'|'platform';appearance?:Partial<ProfileAppearance> }) {
  const palette=appearance?profileAppearance(appearance):undefined
  const variables=palette?{'--profile-preview-background':palette.background,'--profile-preview-ink':readableInk(palette.background)} as CSSProperties:undefined
  return <main className={styles.page} data-variant={variant} style={variables}>
    {variant==='platform'?<OndasAtmosphere/>:null}
    <section className={styles.banner} aria-label="Modo de prévia"><LiquidLens radius={0} edge="none"/><div className={styles.bannerInner}><div><strong>Modo de prévia</strong><p>Somente você vê este rascunho.</p></div><ButtonLink href={backHref}><ActionIcon name="back" />{backLabel}</ButtonLink>{controls}</div></section>
    <div className={variant==='platform'?styles.platformContent:styles.content}>{children}</div>
  </main>
}
