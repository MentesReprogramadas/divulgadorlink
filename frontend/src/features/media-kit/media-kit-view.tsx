import {ProfileView} from '@/features/profiles/components/profile-view'
import {ProfileAgeGate} from '@/features/profiles/profile-age-gate'
import {privateProfileAvatar} from '@/features/profiles/profile-api'
import {type PublicMediaKit} from './media-kit-contract'
import styles from './media-kit.module.css'
import {MediaResults} from './media-results'
export function MediaKitView({kit,preview=false,pending=false}:{kit:PublicMediaKit;preview?:boolean;pending?:boolean}){
 if(kit.restricted)return <ProfileAgeGate/>
 const photo=kit.presentation.avatarAssetId,avatarUrl=photo?(preview?privateProfileAvatar(photo):'/bff/v1/profiles/'+encodeURIComponent(kit.presentation.slug)+'/avatar/'+photo):undefined
 return <ProfileView content={kit.presentation} avatarUrl={avatarUrl} pending={pending} empty={<></>} controls={<div className={styles.publicContent} aria-label="Apresentação para parceiros">
 <section className={styles.publicSection}><h2>Apresentação para parceiros</h2><a className={styles.publicAction} href={kit.profilePath}>Conhecer minha página <span aria-hidden="true">↗</span></a></section>
 {kit.contacts.length?<section className={styles.publicSection} aria-label="Contato comercial"><h2>Vamos conversar</h2>{kit.contacts.map(contact=><a key={contact.kind} className={styles.publicAction} href={(contact.kind==='EMAIL'?'mailto:'+encodeURIComponent(contact.value).replace('%40','@'):'tel:'+contact.value)}>{contact.kind==='EMAIL'?'E-mail':'Telefone'} · {contact.value}</a>)}</section>:null}
 <MediaResults kit={kit}/>
 </div>}/>
}
