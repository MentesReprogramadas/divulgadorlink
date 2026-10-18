'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { FormSteps } from '@/components/ui/form-steps'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { ErrorState } from '@/components/feedback/error-state'
import { EmptyState } from '@/components/feedback/empty-state'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { billingRequest } from './billing-api'
import { billingMoney, type ProfilePlan } from './billing-contract'
import styles from './billing.module.css'
type PlanEdition = {id:string;amountCents:number;providerPriceId:string;capabilities:string[];version:number}
type AdminPlan = {id:string;tier:'PRO'|'PREMIUM';title:string;enabled:boolean;version:number;versions:PlanEdition[]}
export type BillingAdminState = {settings:{enabled:boolean;fiscalReviewed:boolean;publicOrigin:string;livemode:boolean;version:number};providerConfigured:boolean;webhookReady:boolean;salesEnabled:boolean;plans:AdminPlan[];capabilities:ProfilePlan['capabilities'];failedOperations:Array<{id:string;kind:string;lastError:string|null;attempts:number;createdAt:string}>;failedEvents:Array<{id:string;lastError:string|null;attempts:number;receivedAt:string}>;reviews:Array<{id:string;status:string;reviewReason:string;updatedAt:string}>}
type PlanForm = {tier:'PRO'|'PREMIUM';amount:string;price:string;capabilities:string[];enabled:boolean;expectedVersion:number}
type SettingsForm = BillingAdminState['settings']
function AdminContent({data,loading,onEdit,onRetry,busy}: {data?:BillingAdminState;loading?:boolean;onEdit:(tier:'PRO'|'PREMIUM')=>void;onRetry:(kind:'operations'|'events',id:string)=>void;busy:boolean}){
  const text=(value:string)=>loading?<span data-skeleton-block className={styles.ghost}>{value}</span>:value
  return <div className={styles.stack}>
    <article className={styles.card} aria-label="Condições para vender"><div className={styles.heading}><h2>Condições para vender</h2>{data?<span className={loading?styles.ghost:undefined}><Badge tone={data.settings.enabled&&data.providerConfigured&&data.salesEnabled?'ok':'wait'}>{data.settings.enabled?'Vendas habilitadas':'Vendas desativadas'}</Badge></span>:<Skeleton width={150} height={24}/>}</div>
      {data?<ul className={styles.features}>{[['Provedor e webhook',data.providerConfigured],['Liberação de novas vendas',data.salesEnabled],['Revisão fiscal registrada',data.settings.fiscalReviewed]].map(([label,ready])=><li key={String(label)}>{text(String(label)+': '+(ready?'configurado':'pendente'))}</li>)}</ul>:<><Skeleton height={24}/><Skeleton height={24}/><Skeleton height={24}/></>}
      <p className={styles.muted}>{text('A venda exige recursos entregues, preço válido, provedor e revisão fiscal. Desativar vendas preserva confirmações e cancelamentos existentes.')}</p>
    </article>
    <div className={styles.adminCards}>{(['PRO','PREMIUM'] as const).map(tier=>{const plan=data?.plans.find(item=>item.tier===tier),edition=plan?.versions[0];return <article className={styles.card} key={tier} aria-label={'Configuração '+tier}>
      <div className={styles.heading}><h2>{text(tier==='PRO'?'Pro':'Premium')}</h2>{data?<span className={loading?styles.ghost:undefined}><Badge tone={plan?.enabled?'ok':'muted'}>{plan?.enabled?'Habilitado':'Desativado'}</Badge></span>:<Skeleton width={110} height={24}/>}</div>
      <p className={styles.price}>{data?text(edition?billingMoney(edition.amountCents,'BRL')+' / mês':'Sem preço cadastrado'):<Skeleton width={160} height={28}/>}</p>
      {edition?<p className={styles.muted}>{text('Edição '+edition.version+' · contratos anteriores preservados')}</p>:null}
      <Button disabled={!data||busy} onClick={()=>onEdit(tier)}><ActionIcon name={plan?'edit':'plus'}/>{plan?'Editar plano':'Configurar plano'}</Button>
    </article>})}</div>
    {data&&data.failedOperations.length+data.failedEvents.length+data.reviews.length>0?<div className={styles.stack} aria-label="Pendências da cobrança">
      {data.failedOperations.map(row=><article key={row.id} className={styles.card}><div className={styles.heading}><h2>{row.kind==='CANCEL'?'Cancelamento não concluído':'Solicitação não concluída'}</h2><Badge tone="warn">Revisar</Badge></div><p className={styles.code}>{text(row.id)}</p><p className={styles.muted}>{text((row.lastError??'Falha de processamento')+' · '+row.attempts+' tentativas')}</p>{row.kind==='CANCEL'?<WorkspaceActions><Button disabled={busy} onClick={()=>onRetry('operations',row.id)}><ActionIcon name="refresh"/>Tentar cancelamento novamente</Button></WorkspaceActions>:<p className={styles.muted}>Confira a situação antes de iniciar outra assinatura.</p>}</article>)}
      {data.failedEvents.map(row=><article key={row.id} className={styles.card}><h2>Confirmação não concluída</h2><p className={styles.code}>{text(row.id)}</p><p className={styles.muted}>{text((row.lastError??'Falha de processamento')+' · '+row.attempts+' tentativas')}</p><WorkspaceActions><Button disabled={busy} onClick={()=>onRetry('events',row.id)}><ActionIcon name="refresh"/>Conferir novamente</Button></WorkspaceActions></article>)}
      {data.reviews.map(row=><article className={styles.card} key={row.id}><div className={styles.heading}><h2>Assinatura em conferência</h2><Badge tone="warn">Revisar</Badge></div><p className={styles.code}>{text(row.id)}</p><p className={styles.muted}>{text(row.reviewReason)}</p></article>)}
    </div>:data?<EmptyState>Sem pendências de cobrança.</EmptyState>:null}
  </div>
}
export function BillingAdminSkeleton(){return <SkeletonRegion label="Carregando administração das assinaturas"><div className={styles.page}><WorkspaceActions><Skeleton width={160} height={44}/><Skeleton width={44} height={44}/></WorkspaceActions><AdminContent onEdit={()=>{}} onRetry={()=>{}} busy/></div></SkeletonRegion>}
export function BillingAdmin(){
  const [data,setData]=useState<BillingAdminState|null>(null),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [settings,setSettings]=useState<SettingsForm|null>(null),[plan,setPlan]=useState<PlanForm|null>(null),[step,setStep]=useState(0)
  const alive=useRef(false),busy=useRef(false),sequence=useRef(0)
  const load=useCallback(async()=>{const id=++sequence.current;setLoading(true);setError('');try{const next=await billingRequest<BillingAdminState>('/admin/profile-billing');if(alive.current&&sequence.current===id)setData(next)}catch(reason){if(alive.current&&sequence.current===id)setError(reason instanceof Error?reason.message:'Não foi possível carregar.')}finally{if(alive.current&&sequence.current===id)setLoading(false)}},[])
  useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;sequence.current++}},[load])
  function edit(tier:'PRO'|'PREMIUM'){
    if(!data)return;const current=data.plans.find(item=>item.tier===tier),edition=current?.versions[0]
    setPlan({tier,amount:edition?String(edition.amountCents/100):'',price:edition?.providerPriceId??'',capabilities:edition?.capabilities??data.capabilities.filter(item=>['profile.page','profile.categories','profile.appearance','profile.history'].includes(item.key)).map(item=>item.key),enabled:current?.enabled??false,expectedVersion:current?.version??0});setStep(0);setError('')
  }
  async function save(event:FormEvent){
    event.preventDefault();if(busy.current||!data)return
    if(plan&&step===0){setStep(1);return}
    if(plan&&plan.capabilities.length<5){setError('Selecione pelo menos um recurso adicional. Os recursos gratuitos continuam incluídos.');return}
    const amount=plan?Number(plan.amount)*100:0
    if(plan&&(!Number.isSafeInteger(Math.round(amount))||Math.abs(Math.round(amount)-amount)>0.00001||amount<=0)){setError('Use um valor positivo com até duas casas decimais.');return}
    busy.current=true;setPending(true);setError('')
    try{
      await billingRequest(plan?'/admin/profile-billing/plans':'/admin/profile-billing/settings',{method:plan?'POST':'PUT',body:JSON.stringify(plan?{tier:plan.tier,amountCents:Math.round(amount),currency:'BRL',interval:'month',providerPriceId:plan.price,capabilities:plan.capabilities,enabled:plan.enabled,expectedVersion:plan.expectedVersion}:{publicOrigin:settings?.publicOrigin,enabled:settings?.enabled,fiscalReviewed:settings?.fiscalReviewed,expectedVersion:settings?.version})})
      if(alive.current){setSettings(null);setPlan(null);setNotice('Configuração salva. Edições anteriores e contratos existentes foram preservados.');await load()}
    }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível salvar.')}
    finally{busy.current=false;if(alive.current)setPending(false)}
  }
  async function retry(kind:'operations'|'events',id:string){
    if(busy.current)return;busy.current=true;setPending(true);setError('')
    try{await billingRequest('/admin/profile-billing/'+kind+'/'+id+'/retry',{method:'POST',body:'{}'});if(alive.current){setNotice('Nova tentativa registrada. Aguarde a confirmação do provedor.');await load()}}
    catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível tentar novamente.')}
    finally{busy.current=false;if(alive.current)setPending(false)}
  }
  if(!data&&loading)return <BillingAdminSkeleton/>
  const content=data?<AdminContent data={data} loading={loading} onEdit={edit} onRetry={(kind,id)=>void retry(kind,id)} busy={pending||loading}/>:null
  return <section className={styles.page} aria-label="Administração das assinaturas">
    <WorkspaceActions><Button disabled={!data||pending||loading} onClick={()=>{setSettings({...data!.settings});setError('')}}><ActionIcon name="settings"/>Configurar vendas</Button><RefreshButton disabled={pending} onClick={()=>{setError('');void load()}}/></WorkspaceActions>
    {notice?<p role="status" className={styles.notice}>{notice}</p>:null}{error&&!settings&&!plan?<ErrorState message={error} onRetry={()=>void load()}/>:null}
    {loading&&data?<SkeletonRegion label="Atualizando administração das assinaturas">{content}</SkeletonRegion>:content}
    <OverlayDialog open={Boolean(settings||plan)} title={plan?'Configurar '+(plan.tier==='PRO'?'Pro':'Premium'):'Configurar vendas'} onClose={()=>{if(!pending){setSettings(null);setPlan(null)}}}>
      <form className={styles.form} onSubmit={event=>void save(event)}>
        {settings?<><Field label="Endereço público deste site" hint="Use o endereço HTTPS do próprio site."><Input type="url" required value={settings.publicOrigin} onChange={event=>setSettings({...settings,publicOrigin:event.target.value})}/></Field><label className={styles.check}><input type="checkbox" checked={settings.fiscalReviewed} onChange={event=>setSettings({...settings,fiscalReviewed:event.target.checked})}/>A configuração fiscal deste produto foi revisada.</label><label className={styles.check}><input type="checkbox" checked={settings.enabled} onChange={event=>setSettings({...settings,enabled:event.target.checked})}/>Permitir novas assinaturas, quando todas as condições estiverem prontas.</label><p className={styles.muted}>Ambiente {settings.livemode?'real':'de teste'}. Credenciais ficam no servidor. Esta declaração não substitui a revisão fiscal.</p></>:null}
        {plan?<><FormSteps labels={['Preço mensal','Recursos e liberação']} current={step} onBack={setStep}/>{step===0?<><Field label="Valor mensal em reais" icon={<ActionIcon name="payment"/>}><Input type="number" min="0.01" max="21474836.47" step="0.01" required value={plan.amount} onChange={event=>setPlan({...plan,amount:event.target.value})}/></Field><Field label="Código do preço na Stripe" hint="Copie o Price mensal em BRL. Cada nova edição precisa de outro código."><Input required pattern="price_[a-zA-Z0-9_]{1,100}" maxLength={106} value={plan.price} onChange={event=>setPlan({...plan,price:event.target.value})}/></Field></>:<><Field label="Plano"><Select value={plan.tier} disabled><option value="PRO">Pro</option><option value="PREMIUM">Premium</option></Select></Field><fieldset className={styles.form}><legend>Recursos incluídos</legend>{data?.capabilities.filter(item=>plan.tier==='PREMIUM'||!['profile.richBlocks','profile.subdomain'].includes(item.key)).map(item=>{const base=['profile.page','profile.categories','profile.appearance','profile.history'].includes(item.key);return <label className={styles.check} key={item.key}><input type="checkbox" checked={plan.capabilities.includes(item.key)} disabled={base} onChange={event=>setPlan({...plan,capabilities:event.target.checked?[...plan.capabilities,item.key]:plan.capabilities.filter(key=>key!==item.key)})}/>{item.label}{!item.delivered?' · em preparação':''}</label>})}</fieldset><label className={styles.check}><input type="checkbox" checked={plan.enabled} onChange={event=>setPlan({...plan,enabled:event.target.checked})}/>Liberar este plano para novas assinaturas.</label><p className={styles.muted}>Recursos em preparação impedem a venda. A marca Tem Link Aqui permanece.</p></>}</>:null}
        {error?<p role="alert">{error}</p>:null}<WorkspaceActions><Button variant="secondary" type="button" disabled={pending} onClick={()=>plan&&step>0?setStep(step-1):(setPlan(null),setSettings(null))}><ActionIcon name="back"/>Voltar</Button><Button type="submit" loading={pending}><ActionIcon name={plan&&step===0?'next':'save'}/>{plan&&step===0?'Continuar':'Salvar configuração'}</Button></WorkspaceActions>
      </form>
    </OverlayDialog>
  </section>
}
