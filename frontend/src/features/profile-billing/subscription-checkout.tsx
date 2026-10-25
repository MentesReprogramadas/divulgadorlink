import {ActionIcon} from '@/components/ui/action-icon'
import {Badge} from '@/components/ui/badge'
import {billingMoney,type ProfilePlan} from './billing-contract'
import styles from './billing.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function SubscriptionCheckout({plan,changing=false}:{plan:ProfilePlan;changing?:boolean}){
 return <div className={styles.checkout}>
  <section className={styles.orderSummary} aria-label="Resumo da assinatura"><div className={styles.heading}><span className={styles.eyebrow}>Sua escolha</span><Badge tone="ok">Mensal</Badge></div><h3>{plan.title}</h3><p className={styles.checkoutPrice}>{plan.amountCents!==null?billingMoney(plan.amountCents,plan.currency):'Preço indisponível'}<span> / mês</span></p><ul className={styles.features}>{plan.capabilities.filter(item=>item.delivered).map(item=><li key={item.key}><ActionIcon name="check"/><span>{item.label}</span></li>)}</ul><div className={styles.orderTotal}><span>{changing?'Valor mensal no próximo ciclo':'Valor mensal do plano'}</span><strong>{plan.amountCents!==null?billingMoney(plan.amountCents,plan.currency):'Indisponível'}</strong></div><LiquidLens radius={16} /></section>
  <section className={styles.checkoutDetails} aria-label="Como funciona a assinatura"><ActionIcon name={changing?'calendar':'payment'} width={28} height={28}/><h3>{changing?'Troca agendada, sem surpresa':'Revise e continue com segurança'}</h3><p>{changing?'A troca ocorre no próximo ciclo, sem cobrança proporcional agora.':'A cobrança é mensal e recorrente. Os dados e meios de pagamento são apresentados no checkout seguro da Stripe.'}</p><ul className={styles.features}><li><ActionIcon name="check"/><span>Cancele a renovação pelo painel.</span></li><li><ActionIcon name="check"/><span>O período já pago é preservado.</span></li><li><ActionIcon name="check"/><span>Sua página gratuita e seu conteúdo continuam seus.</span></li></ul><p className={styles.muted}>A liberação depende da confirmação do pagamento pelo provedor. A marca Tem Link Aqui permanece na página.</p></section>
 </div>
}
