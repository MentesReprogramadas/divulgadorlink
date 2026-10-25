'use client'
import {useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {LiquidLens} from '@/components/ui/liquid-lens'
import {Field,Input} from '@/components/ui/input'
import {api} from '@/lib/api'
import {LinkPromotionEditor} from './link-promotion-editor'
import styles from './link-promotion-editor.module.css'
export function HighlightLookup(){
 const [address,setAddress]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(''),[link,setLink]=useState<{id:string;name:string}|null>(null),busy=useRef(false)
 async function lookup(){if(busy.current)return;busy.current=true;setPending(true);setError('');setLink(null);try{const url=new URL(address);const id=/^\/link\/([A-Za-z0-9_-]{1,128})\/?$/.exec(url.pathname)?.[1];if(url.origin!==window.location.origin||url.username||url.password||!id)throw new Error('Cole o endereço de um link deste catálogo.');const response=await api<{id:string;name:string;available?:boolean}>('/v1/links/'+encodeURIComponent(id));if(response.status!==200||response.body.available===false||!response.body.name)throw new Error('Link não encontrado ou indisponível.');setLink({id:response.body.id,name:response.body.name})}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível consultar o link.')}finally{busy.current=false;setPending(false)}}
 return <section className={styles.form} aria-label="Destaques administrativos"><form className={styles.form} onSubmit={event=>{event.preventDefault();void lookup()}}><Field label="Endereço do link no catálogo" hint="Abra o link no catálogo e copie o endereço."><Input type="url" required value={address} disabled={pending} onChange={event=>setAddress(event.target.value)}/></Field><Button readOnlyAllowed type="submit" loading={pending} disabled={pending}><ActionIcon name="search"/>Consultar link</Button></form>{error?<p role="alert">{error}</p>:null}{link?<article className={styles.lookupResult}><LiquidLens radius={24}/><h2>{link.name}</h2><LinkPromotionEditor linkId={link.id} linkName={link.name}/></article>:null}</section>
}
