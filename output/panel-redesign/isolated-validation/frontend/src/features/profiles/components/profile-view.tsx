import type { CSSProperties } from 'react'
import { profileAppearance, readableInk } from '../profile-appearance'
import type { ProfileContent } from '../profile-contract'
import Image from 'next/image'
import { CookieSettings } from '@/components/domain/consent'
import styles from './personal-page.module.css'
export function ProfileView({ content, avatarUrl, heading: Heading = 'h1', embedded = false }: { content: ProfileContent; avatarUrl?: string; heading?: 'h1' | 'h3'; embedded?: boolean }) {
  const appearance = profileAppearance(content.appearance)
  const ink = readableInk(appearance.background)
  const variables = { '--page-bg': appearance.background, '--page-ink': ink, '--page-shade': ink === '#ffffff' ? '#000000' : '#ffffff', '--button-bg': appearance.buttonColor, '--button-ink': readableInk(appearance.buttonColor), '--page-radius': { square: '4px', rounded: '18px', pill: '999px' }[appearance.radius], '--page-font': { modern: 'var(--font-outfit), sans-serif', clean: 'var(--font-source-sans), sans-serif', classic: 'Georgia, serif' }[appearance.font] } as CSSProperties
  const groups = content.categories.filter(c => c.visible)
  const items = content.items.filter(i => i.visible && groups.some(c => c.id === i.categoryId) && (i.type === 'CATALOG' || /^https:\/\//i.test(i.destination)))
  const primary = items.find(i => i.id === content.primaryItemId)
  const GroupHeading = Heading === 'h1' ? 'h2' : 'h4'
  const link = (item: typeof items[number], main = false) => <a className={styles.link} data-primary={main || undefined} href={item.type === 'CATALOG' ? '/link/' + encodeURIComponent(item.destination) : item.destination} rel={item.type === 'CATALOG' ? undefined : 'ugc nofollow noopener'}><span>{item.label}</span><span aria-hidden="true">{item.type === 'CATALOG' ? '→' : '↗'}</span></a>
  return <div className={[styles.page, embedded ? styles.embedded : ''].join(' ')} style={variables} data-ink={ink === '#ffffff' ? 'light' : 'dark'} data-style={appearance.buttonStyle} data-background={appearance.backgroundStyle} data-align={appearance.alignment}><article className={styles.profile} aria-label="Perfil público">
    <header className={styles.identity}>
      {avatarUrl ? <Image src={avatarUrl} alt="" width={96} height={96} unoptimized className={styles.avatar} /> : <span className={styles.initial} aria-hidden="true">{content.name.slice(0, 1).toUpperCase() || '•'}</span>}
      <Heading>{content.name || 'Seu nome'}</Heading>
      {content.bio ? <p>{content.bio}</p> : null}
    </header>
    {primary ? link(primary, true) : null}
    {!items.length ? <p className={styles.note}>Nenhum link visível.</p> : groups.map(group => {
      const shown = items.filter(i => i.categoryId === group.id && i.id !== primary?.id)
      return shown.length ? <section key={group.id} aria-label={group.name} className={styles.group}><GroupHeading>{group.name}</GroupHeading><ul>{shown.map(item => <li key={item.id}>{link(item)}</li>)}</ul></section> : null
    })}
  </article><footer className={styles.brand}><CookieSettings /><a href="/divulgar" aria-label="Criado por Tem Link Aqui"><span>Criado por</span><Image src="/logo.svg" alt="Tem Link Aqui" width={66} height={12} unoptimized /></a></footer></div>
}
