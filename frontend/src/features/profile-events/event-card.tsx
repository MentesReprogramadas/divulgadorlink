import type {ProfileContent} from '@/features/profiles/profile-contract'
import {ActionIcon} from '@/components/ui/action-icon'
import {Skeleton} from '@/components/feedback/skeleton'
import {eventStatus} from './event-contract'
import styles from './event.module.css'
type Item=ProfileContent['items'][number]
export function EventCard({item,slug,preview=false,pending=false,now=new Date().toISOString(),heading:Heading='h3'}:{item:Item;slug:string;preview?:boolean;pending?:boolean;now?:string;heading?:'h2'|'h3'|'h4'|'h5'}){
 const event=item.event;if(!event)return null
 const status=eventStatus(event,now),unavailable=status==='Cancelado'||status==='Encerrado'
 const date=(value:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short',timeZone:event.timeZone}).format(new Date(value))
 return <section className={styles.card} aria-label={'Evento: '+item.label} data-event-state={event.state}><div className={styles.status}><ActionIcon name="eventBlock"/>{status}</div><Heading>{item.label}</Heading><p><time dateTime={event.startsAt}>{date(event.startsAt)}</time> — <time dateTime={event.endsAt}>{date(event.endsAt)}</time></p><span className={styles.zone}>{event.timeZone}</span>{event.previousStartsAt?<p>Horário alterado. Antes: {date(event.previousStartsAt)}.</p>:null}<p>{event.location}</p>{event.description?<p className={styles.description}>{event.description}</p>:null}{pending?<div className={styles.actions}>{!unavailable?<Skeleton height="3rem"/>:null}<Skeleton height="3rem"/></div>:<div className={styles.actions}>{!unavailable?<a className={styles.signup} href={preview?undefined:item.destination} aria-disabled={preview||undefined} data-profile-block-id={item.id} rel="ugc nofollow noopener"><ActionIcon name="external"/>Ver inscrição</a>:null}<a className={styles.calendar} href={preview?undefined:'/bff/v1/profiles/'+encodeURIComponent(slug)+'/events/'+item.id+'/calendar.ics'} aria-disabled={preview||undefined} download="evento.ics"><ActionIcon name="download"/>Adicionar ao calendário</a></div>}</section>
}
