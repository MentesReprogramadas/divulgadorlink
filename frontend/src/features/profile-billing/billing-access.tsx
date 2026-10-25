'use client'
import {createContext,useContext,useEffect,useState,type ComponentProps,type ReactNode} from 'react'
import {ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {billingRequest} from './billing-api'
import type {BillingState} from './billing-contract'
import styles from './billing.module.css'

export const paidFeatures = {
 'profile.analytics':{title:'Estatísticas dos botões',description:'Acompanhe visitas e cliques da sua página e compare os resultados dos botões.'},
 'profile.scheduling':{title:'Agendamento dos links',description:'Escolha quando cada link começa e para de aparecer na sua página.'},
 'profile.subdomain':{title:'Subdomínio próprio',description:'Escolha um endereço próprio entre os domínios disponíveis na plataforma.'},
 'profile.richBlocks':{title:'Blocos de conteúdo',description:'Adicione textos, imagens com legenda e vídeos do YouTube ou Vimeo à sua página.'},
} as const
export type PaidFeature = keyof typeof paidFeatures
export function paidFeature(value:string|null):PaidFeature|null{return value&&Object.hasOwn(paidFeatures,value)?value as PaidFeature:null}
export const paywallPath=(feature:PaidFeature)=>'/painel/assinatura?recurso='+encodeURIComponent(feature)
export function routePaidFeature(path:string):PaidFeature|null{
 if(path==='/painel/perfil/conteudo')return 'profile.richBlocks'
 if(path==='/painel/perfil/endereco')return 'profile.subdomain'
 if(path==='/painel/perfil/metricas'||/^\/painel\/perfil\/campanhas\/[^/]+\/metricas$/.test(path))return 'profile.analytics'
 return null
}
type Access={state:BillingState|null;canReadBilling:boolean}
const BillingAccess=createContext<Access>({state:null,canReadBilling:true})
export function BillingAccessProvider({enabled,canReadBilling,ownerId,children}:{enabled:boolean;canReadBilling:boolean;ownerId:string|null;children:ReactNode}){
 const [value,setValue]=useState<{ownerId:string|null;state:BillingState}|null>(null)
 useEffect(()=>{
  if(!enabled||!canReadBilling)return
  let canceled=false
  const load=()=>{void billingRequest<BillingState>('/me/subscription').then(state=>{if(!canceled)setValue({ownerId,state})}).catch(()=>{if(!canceled)setValue(null)})}
  load();window.addEventListener('focus',load);window.addEventListener('profile-billing-changed',load)
  return()=>{canceled=true;window.removeEventListener('focus',load);window.removeEventListener('profile-billing-changed',load)}
 },[enabled,canReadBilling,ownerId])
 return <BillingAccess.Provider value={{state:enabled&&canReadBilling&&value?.ownerId===ownerId?value.state:null,canReadBilling}}>{children}</BillingAccess.Provider>
}
export const useBillingAccess=()=>useContext(BillingAccess)
export function SubscriptionLink({feature,href,children,...props}:ComponentProps<typeof ButtonLink>&{feature:PaidFeature}){
 const {state,canReadBilling}=useBillingAccess(),locked=Boolean(state&&!state.capabilities.includes(feature))
 return <ButtonLink {...props} href={locked&&canReadBilling?paywallPath(feature):href}>{locked?<ActionIcon name="subscriptionLock"/>:null}{children}{locked?<span className={styles.visuallyHidden}> · Requer assinatura</span>:null}</ButtonLink>
}
