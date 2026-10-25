'use client'
import {useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {nicheRequest} from './niche-follows-api'
import styles from './niche-follows.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function NicheDigestUnsubscribe({token}:{token:string}){
 const [pending,setPending]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),busy=useRef(false)
 async function cancel(){if(busy.current)return;busy.current=true;setPending(true);setError('');try{await nicheRequest('niche-digests/unsubscribe',{method:'POST',body:JSON.stringify({token})});setDone(true);history.replaceState(null,'','/resumos/cancelar')}catch(reason){const message=reason instanceof Error?reason.message:'Não foi possível cancelar.';setError(/^Validation error\.?$/.test(message)?'Este link de cancelamento é inválido. Use o link recebido no e-mail mais recente.':message)}finally{busy.current=false;setPending(false)}}
 return <main className="container"><section className={styles.card}><div className={styles.page}><h1>{done?'Resumos desativados':'Parar os resumos por e-mail'}</h1>{done?<p role="status">Você não receberá novos resumos. Pode voltar a ativá-los no seu painel.</p>:<><p>Confirme para deixar de receber novidades das categorias que você segue.</p>{error?<p role="alert">{error}</p>:null}<div className={styles.actions}><Button disabled={pending||!token} loading={pending} onClick={()=>void cancel()}><ActionIcon name="disable"/>Parar resumos</Button></div></>}<ButtonLink href="/painel/interesses" variant="secondary"><ActionIcon name="settings"/>Gerenciar minhas categorias</ButtonLink></div><LiquidLens radius={16} /></section></main>
}
