import type { ProfileContent } from '../profile-contract'
import Image from 'next/image'
import styles from './profiles.module.css'
export function ProfileView({ content, avatarUrl, heading: Heading = 'h1' }: { content: ProfileContent; avatarUrl?: string; heading?: 'h1' | 'h3' }) {
  const groups = content.categories.filter(c => c.visible)
  const items = content.items.filter(i => i.visible && groups.some(c => c.id === i.categoryId) && (i.type === 'CATALOG' || /^https:\/\//i.test(i.destination)))
  const primary = items.find(i => i.id === content.primaryItemId)
  const GroupHeading = Heading === 'h1' ? 'h2' : 'h4'
  const link = (item: typeof items[number], main = false) => <a className={main ? styles.primary : styles.destination} href={item.type === 'CATALOG' ? '/link/' + encodeURIComponent(item.destination) : item.destination} rel={item.type === 'CATALOG' ? undefined : 'ugc nofollow noopener'}>{item.label}<span aria-hidden="true">{item.type === 'CATALOG' ? '→' : '↗'}</span></a>
  return <article className={styles.profile} aria-label="Perfil público">
    <header className={styles.identity}>
      {avatarUrl ? <Image src={avatarUrl} alt="" width={96} height={96} unoptimized className={styles.avatar} /> : <span className={styles.initial} aria-hidden="true">{content.name.slice(0, 1).toUpperCase() || '•'}</span>}
      <Heading>{content.name || 'Seu nome'}</Heading>
      {content.bio ? <p>{content.bio}</p> : null}
    </header>
    {primary ? link(primary, true) : null}
    {!items.length ? <p className={styles.note}>Nenhum link visível.</p> : groups.map(group => {
      const shown = items.filter(i => i.categoryId === group.id && i.id !== primary?.id)
      return shown.length ? <section key={group.id} aria-label={group.name} className={styles.publicGroup}><GroupHeading>{group.name}</GroupHeading><ul>{shown.map(item => <li key={item.id}>{link(item)}</li>)}</ul></section> : null
    })}
  </article>
}
