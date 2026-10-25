import {ContentVideo} from './content-video'
import blockStyles from './content-blocks.module.css'
import {pageText} from '@/domain/public-page-locale'
import {EventCard} from '@/features/profile-events/event-card'
import {ContactForm} from '@/features/contact-forms/contact-form'
import type { CSSProperties, ReactNode } from 'react'
import { profileAppearance, readableInk } from '../profile-appearance'
import type { ProfilePresentation } from '../profile-contract'
import Image from 'next/image'
import {PersonalPageBrand} from './personal-page-brand'
import {ChannelChoices,ChannelLink} from '@/features/profile-channels/channel-choices'
import styles from './personal-page.module.css'
import { Skeleton } from '@/components/feedback/skeleton'
export function ProfileView({ content, avatarUrl, mediaBaseUrl, mediaUrls, heading: Heading = 'h1', embedded = false, pending = false, notice, controls, navigation, empty, contactPreview=false }: { content: ProfilePresentation; avatarUrl?: string; mediaBaseUrl?:string; mediaUrls?:Record<string,string>; heading?: 'h1' | 'h3'; embedded?: boolean; pending?: boolean; notice?: ReactNode; controls?: ReactNode; navigation?: ReactNode; empty?: ReactNode;contactPreview?:boolean }) {
  const uiLocale=content.uiLocale??content.locale,t=(text:string)=>pageText(uiLocale,text)
  const appearance = profileAppearance(content.appearance)
  const ink = readableInk(appearance.background)
  const variables = { '--page-bg': appearance.background, '--page-ink': ink, '--page-shade': ink === '#ffffff' ? '#000000' : '#ffffff', '--button-bg': appearance.buttonColor, '--button-ink': readableInk(appearance.buttonColor), '--page-radius': { square: '4px', rounded: '18px', pill: '999px' }[appearance.radius], '--page-font': { modern: 'var(--font-outfit), sans-serif', clean: 'var(--font-source-sans), sans-serif', classic: 'Georgia, serif' }[appearance.font] } as CSSProperties
  const groups = content.categories.filter(c => c.visible)
  const items = content.items.filter(i => i.visible && !i.templateExample && groups.some(c => c.id === i.categoryId) && (i.type === 'CATALOG' || /^https:\/\//i.test(i.destination)))
  const primary = items.find(i => i.id === content.primaryItemId)
  const channelGroups=(content.channelGroups??[]).filter(group=>groups.some(candidate=>candidate.id===group.id)).map(group=>({...group,channels:group.channels.filter(channel=>items.some(item=>item.id===channel.id&&item.categoryId===group.id))}))
  const GroupHeading = Heading === 'h1' ? 'h2' : 'h4'
  const link = (item: typeof items[number], main = false) => {if(item.event)return <EventCard locale={uiLocale} originalLanguage={content.fallbackLocale} buttonLanguage={content.translationFallbacks?.items.includes(item.id)?content.fallbackLocale:content.locale} item={item} slug={content.slug} preview={embedded||contactPreview} pending={pending} now={content.serverNow} heading={Heading==='h1'?(main?'h2':'h3'):(main?'h4':'h5')}/>;const channel=channelGroups.flatMap(group=>group.channels).find(channel=>channel.id===item.id);if(channel)return <ChannelLink channel={channel} pending={pending} primary={main}/>;return pending ? <span className={`${styles.link} ${styles.pendingLink}`} data-pending-link data-primary={main || undefined}><span className={styles.pendingLabel} aria-hidden="true">{item.label}</span><span className={styles.pendingBar}><Skeleton width="65%" height="1em" /></span><span aria-hidden="true">{item.type === 'CATALOG' ? '→' : '↗'}</span></span> : <a className={styles.link} data-profile-block-id={item.id} data-primary={main || undefined} href={item.type === 'CATALOG' ? '/link/' + encodeURIComponent(item.destination) : item.destination} rel={item.type === 'CATALOG' ? undefined : 'ugc nofollow noopener'}><span lang={content.translationFallbacks?.items.includes(item.id)?content.fallbackLocale:undefined}>{item.label}</span><span aria-hidden="true">{item.type === 'CATALOG' ? '→' : '↗'}</span></a>}
  return <div className={[styles.page, embedded ? styles.embedded : ''].join(' ')} style={variables} data-ink={ink === '#ffffff' ? 'light' : 'dark'} data-style={appearance.buttonStyle} data-background={appearance.backgroundStyle} data-align={appearance.alignment}><article className={styles.profile} lang={uiLocale??content.locale} aria-label={t('Perfil público')} aria-busy={pending || undefined}>
    {notice}
    {appearance.coverStyle==='banner'?<div className={styles.cover} aria-hidden="true"/>:null}
    <header className={styles.identity}>
      {avatarUrl ? <Image src={avatarUrl} alt="" width={96} height={96} unoptimized className={styles.avatar} /> : <span className={styles.initial} aria-hidden="true">{content.name.slice(0, 1).toUpperCase() || '•'}</span>}
      <Heading lang={content.translationFallbacks?.name?content.fallbackLocale:undefined}>{content.name || t('Seu nome')}</Heading>
      {content.bio ? <p lang={content.translationFallbacks?.bio?content.fallbackLocale:undefined}>{content.bio}</p> : null}
    </header>
    {controls}
    {!pending&&content.contentBlocks?.some(block=>block.visible)?<div className={blockStyles.blocks}>{content.contentBlocks.filter(block=>block.visible).map(block=><section key={block.id} className={blockStyles.block} aria-label={block.title}><GroupHeading>{block.title}</GroupHeading>{block.type==='TEXT'?<p>{block.body}</p>:block.type==='IMAGE'?<figure className={blockStyles.block}><Image src={mediaUrls?.[block.assetId]??(mediaBaseUrl??'/bff/v1/profiles/'+encodeURIComponent(content.slug)+'/media/')+block.assetId} alt={block.alt} width={512} height={512} unoptimized loading="lazy"/>{block.caption?<figcaption>{block.caption}</figcaption>:null}</figure>:<ContentVideo key={block.url} url={block.url} title={block.title} locale={uiLocale} preview={embedded||contactPreview||pending}/>}</section>)}</div>:null}
    {primary ? link(primary, true) : null}
    {!items.length&&!channelGroups.length ? empty ?? <p className={styles.note}>{t('Nenhum link visível.')}</p> : groups.map(group => {
      const shown = items.filter(i => i.categoryId === group.id && i.id !== primary?.id)
      const alternatives=channelGroups.find(candidate=>candidate.id===group.id)
      if(alternatives&&!shown.length&&!alternatives.channels.length)return <ChannelChoices locale={uiLocale} key={group.id} group={alternatives} pending={pending} heading={GroupHeading}/>
      return shown.length ? <section key={group.id} aria-label={group.name} className={styles.group}><GroupHeading lang={content.translationFallbacks?.categories.includes(group.id)?content.fallbackLocale:undefined}>{group.name}</GroupHeading><ul>{shown.map(item => <li key={item.id}>{link(item)}</li>)}</ul></section> : null
    })}
    {navigation}
    {content.contactForm?<div lang={uiLocale}><ContactForm locale={uiLocale} key={content.contactForm.revisionId} form={content.contactForm} slug={content.slug} preview={embedded||contactPreview}/></div>:null}
  </article><PersonalPageBrand locale={uiLocale}/></div>
}

