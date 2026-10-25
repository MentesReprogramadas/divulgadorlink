'use client'
import {ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {paidFeatures,paywallPath,useBillingAccess,type PaidFeature} from './billing-access'
import styles from './billing.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function BillingPaywall({feature}:{feature:PaidFeature}){
 const {canReadBilling}=useBillingAccess()
 return <section className={styles.paywall} aria-label="Recurso com assinatura"><div><p className={styles.eyebrow}>Mais possibilidades para sua página</p><h2>{paidFeatures[feature].title}</h2><p>{paidFeatures[feature].description}</p><p className={styles.muted}>{canReadBilling?'Escolha um plano que inclua este recurso. Sua página gratuita continua disponível.':'O responsável pelo espaço precisa liberar este recurso.'}</p></div>{canReadBilling?<ButtonLink href={paywallPath(feature)}><ActionIcon name="subscriptionLock"/>Ver planos</ButtonLink>:null}<LiquidLens radius={16} /></section>
}
