import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {FacetIcon} from '@/components/ui/facet-badge'
import type {PrivateChannel} from './channel-contract'
import styles from './channels.module.css'
export function ChannelDraftList({channels,actions,pending=false}:{channels:PrivateChannel[];actions?:{onEdit:(channel:PrivateChannel,trigger:HTMLElement)=>void;onRemove:(id:string)=>void};pending?:boolean}){
 return <ul className={styles.rows}>{channels.map(channel=><li key={channel.id} className={styles.row}><div className={styles.rowCopy}><strong>{channel.network?<FacetIcon kind="network" slug={channel.network.slug}/>:null}{channel.network?.name??'Rede removida'}: {channel.label}</strong><small>{channel.destinationLabel}</small><div className={styles.badges}><Badge tone={channel.paused?'neutral':channel.available?'ok':'warn'}>{channel.paused?'Pausado':channel.available?'Convite aprovado':'Revisar convite'}</Badge></div></div>{actions?<div className={`${styles.actions} ${styles.rowActions}`}><Button type="button" variant="secondary" disabled={pending} aria-label={'Editar canal '+channel.label} onClick={event=>actions.onEdit(channel,event.currentTarget)}><ActionIcon name="edit"/>Editar</Button><Button type="button" variant="danger" disabled={pending} aria-label={'Remover canal '+channel.label} onClick={()=>actions.onRemove(channel.id)}><ActionIcon name="trash"/>Remover</Button></div>:null}</li>)}</ul>
}
