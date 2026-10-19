import type {PublicChannelGroup} from './channel-contract'
import type {PublicChannel} from './channel-contract'
import {FacetIcon} from '@/components/ui/facet-badge'
import page from '@/features/profiles/components/personal-page.module.css'
import styles from './channel-choices.module.css'
export function ChannelLink({channel,pending=false,primary=false}:{channel:PublicChannel;pending?:boolean;primary?:boolean}){
 const body=<><span className={styles.label} data-pending={pending||undefined}><strong><FacetIcon kind="network" slug={channel.network.slug}/>{channel.network.name}</strong>{channel.showLabel===false?null:<span>{channel.label}</span>}</span><span aria-hidden="true">↗</span></>
 return pending?<span className={page.link} data-primary={primary||undefined}>{body}</span>:<a className={page.link} data-primary={primary||undefined} data-profile-block-id={channel.id} href={channel.href} aria-label={channel.showLabel===false?channel.network.name:channel.network.name+': '+channel.label} rel="ugc nofollow noopener">{body}</a>
}
export function ChannelChoices({group,pending=false,heading:Heading='h2'}:{group:PublicChannelGroup;pending?:boolean;heading?:'h2'|'h4'}){
 return <section className={page.group} aria-label={group.name}><Heading>{group.name}</Heading>{group.channels.length?<ul>{group.channels.map(channel=><li key={channel.id}><ChannelLink channel={channel} pending={pending}/></li>)}</ul>:<p className={page.note}>Não há canais disponíveis agora.</p>}</section>
}
