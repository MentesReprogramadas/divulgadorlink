import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/feedback/skeleton'
import { billingMoney, type ProfilePlan } from './billing-contract'
import styles from './billing.module.css'
export function BillingPlanCard({plan,loading=false,action,disabled,onChoose}: {plan?: ProfilePlan;loading?:boolean;action?:string;disabled?:boolean;onChoose?:()=>void}) {
  const content = (value:ReactNode) => loading ? <span className={styles.ghost} data-skeleton-block>{value}</span> : value
  return <article className={styles.card} aria-label={plan?.title} data-billing-plan>
    <div className={styles.heading}><h2>{plan ? content(plan.title) : <Skeleton width={120} height={28}/>}</h2>{plan ? content(<Badge tone={plan.available?'ok':'muted'}>{plan.tier==='FREE'?'Disponível':plan.available?'Mensal':'Em preparação'}</Badge>) : <Skeleton width={110} height={24}/>}</div>
    <p className={styles.price}>{plan ? content(plan.amountCents !== null ? billingMoney(plan.amountCents,plan.currency)+(plan.tier==='FREE'?'':' / mês') : 'Preço ainda não definido') : <Skeleton width={170} height={28}/>}</p>
    <ul className={styles.features}>{plan ? plan.capabilities.map(item=><li key={item.key}>{content(<><ActionIcon name={item.delivered?'check':'clock'}/><span>{item.label}{!item.delivered?' · em preparação':''}</span></>)}</li>) : Array.from({length:6},(_,index)=><li key={index}><Skeleton width={20} height={20}/><Skeleton width="80%" height={24}/></li>)}</ul>
    {plan?.tier === 'FREE' ? <p className={styles.muted}>{content('Sua página e o conteúdo existente continuam gratuitos.')}</p> : plan && !plan.available ? <p className={styles.muted}>{content('Você será cobrado somente por recursos liberados para venda.')}</p> : <Button disabled={disabled || loading || !plan} onClick={onChoose}><ActionIcon name="payment"/>{action ?? 'Assinar plano'}</Button>}
  </article>
}
