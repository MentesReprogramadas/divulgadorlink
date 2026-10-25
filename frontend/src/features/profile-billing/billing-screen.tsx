'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { ErrorState } from '@/components/feedback/error-state'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { billingRequest } from './billing-api'
import { BillingPlanCard } from './billing-plan-card'
import {SubscriptionCheckout} from './subscription-checkout'
import {BillingOnboarding} from './billing-onboarding'
import {paidFeature,paidFeatures} from './billing-access'
import { billingDate, billingStatus, OPEN_SUBSCRIPTION_STATES, safeBillingCheckout, type BillingOperation, type BillingState, type ProfilePlan } from './billing-contract'
import styles from './billing.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

function CurrentSubscription({state,loading=false}: {state?:BillingState;loading?:boolean}) {
  const row=state?.subscription
  const value=(text:string)=>loading?<span data-skeleton-block className={styles.ghost}>{text}</span>:text
  return <article className={styles.card} aria-label="Situação da assinatura">
    <div className={styles.heading}><h2>{state?value(row?.title??'Gratuito'):<Skeleton width={140} height={28}/>}</h2>{state?<span className={loading?styles.ghost:undefined}><Badge tone={row?.hasPaidAccess?'ok':row && OPEN_SUBSCRIPTION_STATES.includes(row.status)?'wait':'neutral'}>{row?billingStatus[row.status]??'Em conferência':'Sem assinatura paga'}</Badge></span>:<Skeleton width={160} height={24}/>}</div>
    <p className={styles.muted}>{state?value(row?.cancelAtPeriodEnd?'Renovação cancelada. O saldo pago permanece até o fim da cobertura.':row?.nextPlan?'Próximo ciclo: '+row.nextPlan.title+'. O plano atual continua até a troca.':'Sua página e o conteúdo gratuito são preservados em qualquer plano.'):<Skeleton width="85%" height={24}/>}</p>
    {row?.periodEnd || row?.paidThrough ? <dl className={styles.dates}>{row.periodEnd?<div><dt>Fim do ciclo</dt><dd>{value(billingDate(row.periodEnd))}</dd></div>:null}{row.paidThrough?<div><dt>Pagamento confirmado até</dt><dd>{value(billingDate(row.paidThrough))}</dd></div>:null}</dl>:null}
    {row?.reviewReason?<p className={styles.muted}>{value('Há uma conferência pendente. Nenhuma confirmação depende só do retorno do checkout.')}</p>:null}
  <LiquidLens radius={16} /></article>
}
export function BillingSkeleton() {
  return <SkeletonRegion label="Carregando assinatura"><div className={styles.page}><WorkspaceActions><Skeleton width={44} height={44}/></WorkspaceActions><CurrentSubscription/><div className={styles.cards}>{[0,1,2].map(index=><BillingPlanCard key={index}/>)}</div></div></SkeletonRegion>
}
type Confirmation = {kind:'CHECKOUT'|'CHANGE';plan:ProfilePlan}|{kind:'CANCEL'}
export function BillingScreen({requiredFeature}:{requiredFeature?:string}={}) {
  const [data,setData]=useState<{state:BillingState;plans:ProfilePlan[]}|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [confirmation,setConfirmation]=useState<Confirmation|null>(null),[operation,setOperation]=useState<{id:string;redirect:boolean}|null>(null),[pending,setPending]=useState(false)
  const feature=paidFeature(requiredFeature??null)
  const alive=useRef(false),sequence=useRef(0),busy=useRef(false),intent=useRef<{payload:string;key:string}|null>(null)
  const load=useCallback(async()=>{
    const current=++sequence.current;setLoading(true);setError('')
    try { const [state,catalog]=await Promise.all([billingRequest<BillingState>('/me/subscription'),billingRequest<{plans:ProfilePlan[]}>('/profile-plans')]);if(alive.current&&current===sequence.current){setData({state,plans:catalog.plans});window.dispatchEvent(new Event('profile-billing-changed'))} }
    catch(reason){if(alive.current&&current===sequence.current)setError(reason instanceof Error?reason.message:'Não foi possível carregar.')}
    finally{if(alive.current&&current===sequence.current)setLoading(false)}
  },[])
  useEffect(()=>{alive.current=true;void load();const query=new URLSearchParams(window.location.search);const returned=query.get('checkout');if(returned)setNotice(returned==='returned'?'Você voltou do pagamento. Aguarde a confirmação; retornar não ativa o plano.':'Pagamento interrompido. Confira a situação antes de recomeçar.');return()=>{alive.current=false;sequence.current++}},[load])
  useEffect(()=>{
    if(!operation)return
    let stopped=false,attempt=0,timer:ReturnType<typeof setTimeout>|undefined
    const poll=async()=>{
      try{
        const result=await billingRequest<BillingOperation>('/me/billing-operations/'+operation.id)
        if(stopped)return
        if(result.state==='DONE'){
          if(operation.redirect&&result.checkoutUrl){window.location.assign(safeBillingCheckout(result.checkoutUrl));return}
          setOperation(null);setNotice('Solicitação processada. A situação abaixo considera a confirmação do provedor.');void load();return
        }
        if(result.state==='FAILED'){setOperation(null);await load();if(!stopped)setError(result.message??'Solicitação não concluída. Atualize a situação.');return}
        if(++attempt>=30){setOperation(null);setNotice('A confirmação continua em processamento. Use Atualizar situação para acompanhar.');void load();return}
        timer=setTimeout(()=>void poll(),2000)
      }catch(reason){if(!stopped){setOperation(null);setError(reason instanceof Error?reason.message:'Atualize a situação.')}}
    };void poll();return()=>{stopped=true;if(timer)clearTimeout(timer)}
  },[operation,load])
  async function submit(){
    if(!confirmation||busy.current||!data)return
    busy.current=true;setPending(true);setError('')
    const selection=confirmation,sub=data.state.subscription
    const path=selection.kind==='CHECKOUT'?'/subscriptions/checkout':selection.kind==='CHANGE'?'/me/subscription/change':'/me/subscription/cancel'
    const body=selection.kind==='CHECKOUT'?{planVersionId:selection.plan.versionId,returnPath:'/painel/assinatura'}:selection.kind==='CHANGE'?{expectedVersion:sub?.version,targetPlanVersionId:selection.plan.versionId,timing:'PERIOD_END'}:{expectedVersion:sub?.version}
    const fingerprint=path+JSON.stringify(body)
    if(intent.current?.payload!==fingerprint)intent.current={payload:fingerprint,key:crypto.randomUUID()}
    try{
      const result=await billingRequest<{operationId:string}>(path,{method:'POST',headers:{'idempotency-key':intent.current.key},body:JSON.stringify(body)})
      if(!alive.current)return
      setConfirmation(null);setOperation({id:result.operationId,redirect:selection.kind==='CHECKOUT'});setNotice('Solicitação recebida. Aguarde o processamento.');intent.current=null
    }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível concluir.')}
    finally{busy.current=false;if(alive.current)setPending(false)}
  }
  async function reconcile(){
    if(busy.current)return;busy.current=true;setPending(true);setError('')
    try{await billingRequest('/me/subscription/reconcile',{method:'POST',body:'{}'});if(alive.current){setNotice('Conferência solicitada. Aguarde alguns instantes e atualize a situação.');await load()}}
    catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível conferir.')}
    finally{busy.current=false;if(alive.current)setPending(false)}
  }
  if(!data&&loading)return <BillingSkeleton/>
  const sub=data?.state.subscription,open=Boolean(sub&&OPEN_SUBSCRIPTION_STATES.includes(sub.status)),blocked=pending||Boolean(operation)||loading||Boolean(data?.state.operations.length)
  if(data?.state.checkoutRequirement&&!open)return <BillingOnboarding requirement={data.state.checkoutRequirement}/>
  const plans=data?.plans.filter(plan=>plan.tier==='FREE'||plan.available||plan.versionId===sub?.planVersionId)??[]
  const featured=plans.filter(plan=>plan.tier!=='FREE'&&plan.available&&(!feature||plan.capabilities.some(item=>item.key===feature&&item.delivered))).sort((a,b)=>(a.amountCents??Infinity)-(b.amountCents??Infinity))[0]
  if(data&&!open&&!plans.some(plan=>plan.tier!=='FREE'&&plan.available))return <section className={styles.onboarding} aria-label="Sua página gratuita"><h2>Sua página continua gratuita</h2><p>Continue editando e publicando sua página. Os planos pagos aparecerão aqui quando estiverem disponíveis para contratar.</p><ButtonLink href="/painel/perfil">Editar minha página</ButtonLink><LiquidLens radius={16}/></section>
  const body=data?<div className={styles.stack}>
    <div className={styles.planIntro}>{feature?<><h2>{paidFeatures[feature].title}</h2><p>{paidFeatures[feature].description}</p></>:<p>Compare os recursos e escolha seu plano. Cobrança mensal, com cancelamento da renovação pelo painel.</p>}</div>
    {feature&&!featured?<p className={styles.muted}>Este recurso não está disponível para contratação no momento.</p>:null}
    <div className={styles.cards}>{plans.map(plan=><BillingPlanCard key={plan.tier} plan={plan} highlighted={featured?.tier===plan.tier} current={sub?.hasPaidAccess?sub.planVersionId===plan.versionId:plan.tier==='FREE'} loading={loading} disabled={blocked||!data.state.canCheckout||open&&(!sub?.canChange||sub.planVersionId===plan.versionId)} action={open?'Trocar no próximo ciclo':'Assinar plano'} onChoose={()=>{intent.current=null;setError('');setConfirmation({kind:open?'CHANGE':'CHECKOUT',plan})}}/>)}</div>
    {sub?<CurrentSubscription state={data.state} loading={loading}/>:null}
    <p className={styles.muted}>A marca Tem Link Aqui permanece em todos os planos. Trocas e cancelamentos de planos pagos valem para o próximo ciclo; seu conteúdo é preservado.</p>
  </div>:null
  return <section className={styles.page} aria-label="Assinatura da minha página">
    <WorkspaceActions>{sub?.resumeCheckoutUrl?<Button disabled={blocked} onClick={()=>window.location.assign(safeBillingCheckout(sub.resumeCheckoutUrl!))}><ActionIcon name="payment"/>Continuar pagamento</Button>:null}{open&&!sub?.cancelAtPeriodEnd?<Button variant="secondary" disabled={blocked} onClick={()=>{intent.current=null;setError('');setConfirmation({kind:'CANCEL'})}}><ActionIcon name="disable"/>Cancelar renovação</Button>:null}{sub?<Button variant="secondary" disabled={blocked} onClick={()=>void reconcile()}><ActionIcon name="check"/>Conferir pagamento</Button>:null}<RefreshButton label="Atualizar situação" disabled={pending||Boolean(operation)} onClick={()=>void load()}/></WorkspaceActions>
    {notice?<p role="status" className={styles.notice}>{notice}</p>:null}{error&&!confirmation?<ErrorState message={error} onRetry={()=>void load()}/>:null}{data?.state.operations.length&&!operation?<p role="status" className={styles.notice}>Há uma solicitação em processamento. Atualize a situação antes de fazer outra.</p>:null}
    {loading&&data?<SkeletonRegion label="Atualizando assinatura">{body}</SkeletonRegion>:body}
    <OverlayDialog open={Boolean(confirmation)} size={confirmation?.kind==='CANCEL'?'default':'wide'} closeDisabled={pending} title={confirmation?.kind==='CANCEL'?'Cancelar renovação':confirmation?.kind==='CHANGE'?'Confirmar troca':'Confirmar assinatura'} onClose={()=>{if(!pending)setConfirmation(null)}}><div className={styles.dialog}>
      {confirmation?.kind==='CANCEL'?<p>O plano pago deixa de renovar. O período já pago continua disponível e sua página gratuita é preservada.</p>:confirmation?<SubscriptionCheckout plan={confirmation.plan} changing={confirmation.kind==='CHANGE'}/>:null}
      {error?<p role="alert">{error}</p>:null}<div className={styles.confirmationActions}><WorkspaceActions><Button variant="secondary" disabled={pending} onClick={()=>setConfirmation(null)}><ActionIcon name="back"/>Voltar</Button><Button loading={pending} onClick={()=>void submit()}><ActionIcon name={confirmation?.kind==='CANCEL'?'disable':'check'}/>{confirmation?.kind==='CHECKOUT'?'Ir para pagamento':'Confirmar'}</Button></WorkspaceActions><LiquidLens radius={16}/></div>
    </div></OverlayDialog>
  </section>
}
