'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { affiliateRequest, deliveryLabels, type CatalogProduct, type DiscoveryProduct } from './contracts'
import { ProductImage } from './product-image'
import styles from './day-planner.module.css'
import common from './affiliates.module.css'

type PlanSummary={id:string;status:string;config:{day:string;start:string;end:string};_count:{entries:number}}
export type DayPlan={id:string;status:string;mode:'AUTO'|'MANUAL';source:'RULES'|'OPENAI';expiresAt:string;error:string|null;config:{day:string;start:string;end:string};groups:Array<{id:string;name:string}>;dailyByGroup?:Array<{id:string;name:string;messages:number}>;summary:{offers:number;groups:number;totalMessages:number;intervalMinutes:number|null;maxIntervalMinutes?:number|null;firstAt?:string|null;lastAt?:string|null};entries:Array<{id:string;itemId:string;scheduledAt:string;state:string;error:string|null;title:string;product?:CatalogProduct;message?:string;affiliateUrl?:string;sentCount?:number;counts?:Array<{state:string;count:number}>}>}
const labels:Record<string,string>={BUILDING:'Preparando',DRAFT:'Revisar',APPROVED:'Agendado',CANCELLED:'Cancelado',FAILED:'Conferir',READY:'Pronto',PENDING:'Agendado',PROCESSING:'Conferindo preço',QUEUED:'Na fila'}
const brDay=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(date)
const brTime=(date:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(date))
function planCadence(plan:DayPlan){
  const range=plan.summary.firstAt&&plan.summary.lastAt?`${brTime(plan.summary.firstAt)}–${brTime(plan.summary.lastAt)}`:`${plan.config.start}–${plan.config.end}`
  const min=plan.summary.intervalMinutes,max=plan.summary.maxIntervalMinutes??min
  return `${plan.config.day.split('-').reverse().join('/')} · ${range} · Brasília${min!==null?max!==min?` · intervalos de ${min} a ${max} min`:` · intervalo de ${min} min`:''}`
}

export function DayPlanner({segmentId,selected,clearSelection,onChanged,disabled=false}:{segmentId:string;selected:DiscoveryProduct[];clearSelection:()=>void;onChanged:()=>void;disabled?:boolean}){
  const [batches,setBatches]=useState<PlanSummary[]>([]),[revision,setRevision]=useState(0),[agenda,setAgenda]=useState(false),[open,setOpen]=useState(false),[manual,setManual]=useState(false),[id,setId]=useState<string|null>(null),[agendaError,setAgendaError]=useState('')
  const trigger=useRef<HTMLElement|null>(null)
  const base='/segments/'+encodeURIComponent(segmentId)+'/day-plans'
  useEffect(()=>{const abort=new AbortController();void affiliateRequest<{batches:PlanSummary[]}>(base,'GET',undefined,abort.signal).then(result=>{if(!abort.signal.aborted){setBatches(result.batches??[]);setAgendaError('')}}).catch(()=>{if(!abort.signal.aborted)setAgendaError('Não foi possível carregar a agenda.')});return()=>abort.abort()},[base,revision])
  function show(manual:boolean,id:string|null=null){trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setManual(manual);setId(id);setOpen(true)}
  return <>
    <div className={styles.toolbar}><Button disabled={disabled} onClick={()=>show(false)}>Planejar o dia</Button><Button variant="secondary" onClick={()=>setAgenda(!agenda)} aria-expanded={agenda}>Agenda{batches.length?` (${batches.length})`:''}</Button></div>
    {agenda?<div className={styles.agenda} aria-label="Lotes de ofertas">{agendaError?<p role="alert">{agendaError} <Button variant="secondary" onClick={()=>setRevision(v=>v+1)}>Tentar novamente</Button></p>:null}{batches.length?batches.map(batch=><button key={batch.id} onClick={()=>show(batch.status==='DRAFT',batch.id)} className={styles.agendaRow}><strong>{batch.config.day.split('-').reverse().join('/')} · {batch.config.start}–{batch.config.end}</strong><span>{labels[batch.status]??batch.status} · {batch._count.entries} ofertas</span></button>):!agendaError?<p>Nenhum lote agendado nesta segmentação.</p>:null}</div>:null}
    {selected.length?<div className={styles.selection} aria-label="Ofertas selecionadas"><p role="status"><strong>{selected.length}</strong> {selected.length===1?'oferta selecionada':'ofertas selecionadas'}</p><Button disabled={disabled} onClick={()=>show(true)}>Agendar grupo</Button><Button variant="ghost" onClick={clearSelection}>Limpar</Button></div>:null}
    {open?<DayPlanDialog key={id??(manual?'manual':'auto')} base={base} initialId={id} selected={manual?selected:undefined} onClose={()=>{setOpen(false);setRevision(v=>v+1)}} onChanged={()=>{onChanged();setRevision(v=>v+1)}} clearSelection={clearSelection} returnFocusTo={trigger.current}/>:null}
  </>
}

function DayPlanDialog({base,initialId,selected,onClose,onChanged,clearSelection,returnFocusTo}:{base:string;initialId:string|null;selected?:DiscoveryProduct[];onClose:()=>void;onChanged:()=>void;clearSelection:()=>void;returnFocusTo:HTMLElement|null}){
  const [id,setId]=useState(initialId),[plan,setPlan]=useState<DayPlan|null>(null),[day,setDay]=useState(()=>brDay(new Date(Date.now()+86400000))),[start,setStart]=useState('09:00'),[end,setEnd]=useState('21:00'),[count,setCount]=useState(12),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[cancelConfirm,setCancelConfirm]=useState(false),[now,setNow]=useState(Date.now())
  const lock=useRef(false),mounted=useRef(true),requestKey=useRef<{input:string;key:string}|null>(null)
  useEffect(()=>{mounted.current=true;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{mounted.current=false;clearInterval(timer)}},[])
  useEffect(()=>{
    if(!id)return
    const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined
    async function load(){try{const value=await affiliateRequest<DayPlan>(base+'/'+encodeURIComponent(id!),'GET',undefined,abort.signal);if(abort.signal.aborted)return;setPlan(value);setError('');if(['BUILDING','APPROVED'].includes(value.status))timer=setTimeout(()=>void load(),value.status==='BUILDING'?2000:10000)}catch(reason){if(!abort.signal.aborted)setError(reason instanceof Error?reason.message:'Não foi possível carregar o lote. Tente novamente.')}}
    void load();return()=>{abort.abort();clearTimeout(timer)}
  },[base,id,reload])
  async function generate(event:FormEvent){
    event.preventDefault();if(lock.current)return
    lock.current=true;setBusy(true);setError('')
    const input={day,start,end,count:selected?.length??count,...(selected?{itemIds:selected.map(p=>p.id)}:{})}
    const serialized=JSON.stringify(input)
    if(requestKey.current?.input!==serialized)requestKey.current={input:serialized,key:crypto.randomUUID()}
    try{const value=await affiliateRequest<{id:string}>(base,'POST',{...input,idempotencyKey:requestKey.current!.key});if(mounted.current){setId(value.id);onChanged()}}
    catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Não foi possível preparar. Tente novamente.')}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  async function mutate(path:string,body?:unknown,method='POST'){
    if(lock.current||!id)return
    lock.current=true;setBusy(true);setError('')
    try{await affiliateRequest(base+'/'+encodeURIComponent(id)+path,method,body);if(mounted.current){setReload(v=>v+1);onChanged();if(path==='/approve'){clearSelection()}setCancelConfirm(false)}}
    catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Não foi possível salvar. Confira a agenda antes de repetir.')}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  const expired=!!plan&&Date.parse(plan.expiresAt)<=now,quantity=selected?.length??count
  const interval=quantity>1?Math.floor(((Number(end.slice(0,2))*60+Number(end.slice(3)))-(Number(start.slice(0,2))*60+Number(start.slice(3))))/(quantity-1)):null
  return <OverlayDialog open title={plan?.status==='APPROVED'?'Ofertas agendadas':id?'Revisar lote de ofertas':selected?'Agendar ofertas selecionadas':'Planejar ofertas do dia'} size="wide" onClose={()=>{if(!busy)onClose()}} closeDisabled={busy} returnFocusTo={returnFocusTo}>
    {error?<p role="alert" className={common.error}>{error}{id?<Button variant="secondary" onClick={()=>setReload(v=>v+1)}>Tentar carregar novamente</Button>:null}</p>:null}
    {!id?<form className={styles.form} onSubmit={event=>void generate(event)}>
      <p>{selected?`${selected.length} ofertas escolhidas por você.`:'A IA organiza as ofertas disponíveis, priorizando descontos e produtos menos enviados. Sem desconto, completa com os demais.'}</p>
      <label>Dia<input required type="date" value={day} min={brDay(new Date())} max={brDay(new Date(Date.now()+30*86400000))} onChange={e=>setDay(e.target.value)}/></label>
      <div className={styles.fields}><label>Começa às<input required type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Termina às<input required type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
      {!selected?<label>Ofertas no dia<input required type="number" min={1} max={24} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>:null}
      <p className={styles.summary}><strong>{quantity} ofertas por grupo</strong>{interval!==null?` · cerca de ${interval} min entre ofertas`:''}<span>Horário de Brasília. Você revisa as mensagens e os destinos antes de aceitar.</span></p>
      <Button type="submit" loading={busy} disabled={busy||!!selected&&!selected.length||interval!==null&&interval<15}>Gerar prévia do lote</Button>
    </form>:!plan?<p role="status">Carregando lote…</p>:<div className={styles.review}>
      {plan.status==='BUILDING'?<p role="status">Preparando fotos, preços e links… Você pode fechar e retomar pela Agenda.</p>:null}
      {plan.error?<p role="alert" className={common.warning}>{plan.error}</p>:null}
      {plan.status!=='BUILDING'?<><div className={styles.summary}><strong>{plan.summary.offers} {plan.summary.offers===1?'oferta · 1 mensagem':'ofertas · '+plan.summary.offers+' mensagens'} por grupo</strong><span>{plan.summary.groups} {plan.summary.groups===1?'grupo':'grupos'} · {plan.summary.totalMessages} mensagens neste lote</span><span>{planCadence(plan)}</span>{plan.dailyByGroup?.length?<span>Total do dia: {Math.min(...plan.dailyByGroup.map(g=>g.messages))===Math.max(...plan.dailyByGroup.map(g=>g.messages))?plan.dailyByGroup[0].messages:`${Math.min(...plan.dailyByGroup.map(g=>g.messages))} a ${Math.max(...plan.dailyByGroup.map(g=>g.messages))}`} mensagens por grupo.</span>:null}</div>
        <details><summary className={styles.detailsSummary}>Destinos e total de mensagens no dia</summary><ul>{plan.groups.map(g=><li key={g.id}>{g.name}{plan.dailyByGroup?` · ${plan.dailyByGroup.find(d=>d.id===g.id)?.messages??0} mensagens no dia, incluindo este lote`:''}</li>)}</ul></details>
        {plan.mode==='AUTO'?<p className={common.muted}>{plan.source==='OPENAI'?'Sequência organizada com IA.':'Sequência organizada por desconto e histórico; IA indisponível nesta geração.'}</p>:null}
        </>:null}
      <ol className={styles.entries}>{plan.entries.filter(e=>e.state!=='CANCELLED').map(entry=><li key={entry.id} className={styles.entry}>
        <div className={styles.entryTop}><time dateTime={entry.scheduledAt}>{brTime(entry.scheduledAt)}</time><span>{entry.counts?.length?entry.counts.map(c=>`${c.count} ${deliveryLabels[c.state]??c.state}`).join(' · '):labels[entry.state]??entry.state}</span></div>
        <div className={styles.product}>{entry.product?<ProductImage src={entry.product.imageUrl} title={entry.title}/>:<div aria-hidden="true"/>}<div><strong>{entry.title}</strong>{entry.product?<p><b>{formatCents(entry.product.priceCents)}</b>{entry.product.reportedDiscountPercent?` · ${entry.product.reportedDiscountPercent}% OFF`:entry.product.oldPriceCents&&entry.product.oldPriceCents>entry.product.priceCents?` · ${Math.floor((1-entry.product.priceCents/entry.product.oldPriceCents)*100)}% OFF`:''}</p>:null}<span className={common.muted}>{entry.sentCount??0} {entry.sentCount===1?'envio anterior':'envios anteriores'}</span></div></div>
        {entry.error?<p className={common.warning}>{entry.error}</p>:null}
        <div className={styles.entryActions}>{entry.message?<details><summary className={styles.detailsSummary}>Ver mensagem e link</summary><pre className={styles.message}>{entry.message}</pre></details>:null}
        {plan.status==='DRAFT'&&entry.state==='READY'?<Button variant="ghost" disabled={busy} onClick={()=>void mutate('/entries/'+encodeURIComponent(entry.id),undefined,'DELETE')} aria-label={'Remover do lote: '+entry.title}>Remover</Button>:null}</div>
      </li>)}</ol>
      {plan.status!=='BUILDING'?<details><summary className={styles.detailsSummary}>Como funciona o envio</summary><p className={common.muted}>Cada oferta entra na fila no horário mostrado e segue para os grupos. O tempo de entrega depende das conexões, com tolerância de 30 minutos. Mudança de preço bloqueia a oferta para revisão.</p></details>:null}
      {plan.status==='DRAFT'&&expired?<p role="alert" className={common.warning}>Este rascunho expirou. Feche e gere outro lote para reconferir os preços.</p>:null}
      <div className={styles.footer}>
        {plan.status==='DRAFT'?<Button disabled={busy||expired||!plan.summary.offers} loading={busy} onClick={()=>void mutate('/approve',{confirm:true})}>Aceitar e agendar {plan.summary.offers} {plan.summary.offers===1?'oferta':'ofertas'}</Button>:null}
        {['BUILDING','DRAFT'].includes(plan.status)?<Button variant="ghost" disabled={busy} onClick={()=>void mutate('/cancel',{confirm:true})}>Descartar lote</Button>:null}
        {plan.status==='APPROVED'?cancelConfirm?<><p>Cancelar os envios pendentes? Mensagens já enviadas ou em processamento não serão desfeitas.</p><Button variant="danger" disabled={busy} onClick={()=>void mutate('/cancel',{confirm:true})}>Confirmar cancelamento das pendências</Button><Button variant="ghost" onClick={()=>setCancelConfirm(false)}>Voltar</Button></>:<Button variant="secondary" disabled={busy} onClick={()=>setCancelConfirm(true)}>Cancelar pendências</Button>:null}
        <Button variant="secondary" disabled={busy} onClick={onClose}>Fechar</Button>
      </div>
    </div>}
  </OverlayDialog>
}
