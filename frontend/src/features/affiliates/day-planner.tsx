'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { dayPlanDefaults, dayPlanDateLabel } from '@/domain/affiliate-day-plan'
import { affiliateRequest, deliveryLabels, type CatalogProduct, type DiscoveryProduct } from './contracts'
import { ProductImage } from './product-image'
import styles from './day-planner.module.css'
import common from './affiliates.module.css'

type PlanSummary={id:string;status:string;config:{day:string;start:string;end:string};groupCount?:number;_count:{entries:number}}
export type DayPlan={id:string;status:string;mode:'AUTO'|'MANUAL';source:'RULES'|'OPENAI';expiresAt:string;error:string|null;config:{day:string;start:string;end:string};groups:Array<{id:string;name:string}>;dailyByGroup?:Array<{id:string;name:string;messages:number}>;summary:{offers:number;groups:number;totalMessages:number;intervalMinutes:number|null;maxIntervalMinutes?:number|null;firstAt?:string|null;lastAt?:string|null};entries:Array<{id:string;itemId:string;scheduledAt:string;state:string;kind?:'THEME'|'GIFT'|'OUTSIDE';error:string|null;title:string;product?:CatalogProduct;message?:string;affiliateUrl?:string;sentCount?:number;counts?:Array<{state:string;count:number}>}>}
const labels:Record<string,string>={BUILDING:'Preparando',DRAFT:'Revisar',APPROVED:'Agendado',CANCELLED:'Cancelado',FAILED:'Conferir',READY:'Pronto',PENDING:'Agendado',PROCESSING:'Conferindo preço',QUEUED:'Na fila'}
const brDay=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(date)
const brTime=(date:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(date))
function planCadence(plan:DayPlan){
  const range=plan.summary.firstAt&&plan.summary.lastAt?`${brTime(plan.summary.firstAt)}–${brTime(plan.summary.lastAt)}`:`${plan.config.start}–${plan.config.end}`
  const min=plan.summary.intervalMinutes,max=plan.summary.maxIntervalMinutes??min
  return `${dayPlanDateLabel(plan.config.day)} · ${range} · Brasília${min!==null?max!==min?` · intervalos de ${min} a ${max} min`:` · intervalo de ${min} min`:''}`
}

export function DayPlanner({segmentId,segmentName='',selected,clearSelection,onChanged,disabled=false,agenda:controlledAgenda,onAgendaChange}:{agenda?:boolean;onAgendaChange?:(open:boolean)=>void;segmentId:string;segmentName?:string;selected:DiscoveryProduct[];clearSelection:()=>void;onChanged:()=>void;disabled?:boolean}){
  const [batches,setBatches]=useState<PlanSummary[]>([]),[revision,setRevision]=useState(0),[localAgenda,setAgenda]=useState(false),[open,setOpen]=useState(false),[manual,setManual]=useState(false),[id,setId]=useState<string|null>(null),[agendaError,setAgendaError]=useState('')
  const agenda=controlledAgenda??localAgenda
  const [page,setPage]=useState(1),[pagination,setPagination]=useState<{page:number;total:number;hasPrevious:boolean;hasNext:boolean}|null>(null),[loading,setLoading]=useState(false)
  const trigger=useRef<HTMLElement|null>(null)
  const base='/segments/'+encodeURIComponent(segmentId)+'/day-plans'
  useEffect(()=>{if(!agenda)return;const abort=new AbortController();setLoading(true);setAgendaError('');void affiliateRequest<{batches:PlanSummary[];pagination?:typeof pagination}>(base+'?page='+page+'&limit=8','GET',undefined,abort.signal).then(result=>{if(!abort.signal.aborted){setBatches(result.batches??[]);setPagination(result.pagination??null)}}).catch(()=>{if(!abort.signal.aborted)setAgendaError('Não foi possível carregar a agenda.')}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[base,revision,agenda,page])
  function show(manual:boolean,id:string|null=null){trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setManual(manual);setId(id);setOpen(true)}
  return <>
    <div className={styles.toolbar}><Button disabled={disabled} onClick={()=>show(false)}>Planejar o dia</Button>{!onAgendaChange?<Button variant="secondary" onClick={()=>setAgenda(!agenda)} aria-expanded={agenda}>Agenda</Button>:null}</div>
    {agenda?<section className={styles.agenda} role={onAgendaChange?'tabpanel':undefined} id={onAgendaChange?'discovery-evaluation-panel-AGENDA':undefined} aria-labelledby={onAgendaChange?'discovery-evaluation-AGENDA':undefined} aria-label="Agendas de ofertas" aria-busy={loading}><h3>Agendas de ofertas</h3>{agendaError?<p role="alert">{agendaError} <Button variant="secondary" onClick={()=>setRevision(v=>v+1)}>Tentar novamente</Button></p>:<>{loading?<p role="status">Carregando agendas…</p>:null}<div className={styles.agendaGrid}>{batches.length?batches.map(batch=><article key={batch.id} className={styles.agendaCard}><span className={common.state} data-state={batch.status}>{labels[batch.status]??batch.status}</span><h4>{dayPlanDateLabel(batch.config.day)}</h4><p>{batch.config.start}–{batch.config.end} · Brasília</p><p><strong>{batch._count.entries} ofertas</strong>{batch.groupCount!==undefined?` · ${batch.groupCount} grupos`:''}</p><Button variant="secondary" onClick={()=>show(batch.status==='DRAFT',batch.id)}>Abrir agenda</Button></article>):!loading?<p>Nenhum lote agendado nesta segmentação.</p>:null}</div>{pagination?<nav className={styles.pagination} aria-label="Páginas de agendas"><Button variant="secondary" disabled={loading||!pagination.hasPrevious} onClick={()=>setPage(p=>p-1)}>Anterior</Button><span role="status">Página {pagination.page} · {pagination.total} agendas</span><Button variant="secondary" disabled={loading||!pagination.hasNext} onClick={()=>setPage(p=>p+1)}>Próxima</Button></nav>:null}</>}</section>:null}
    {selected.length?<div className={styles.selection} aria-label="Ofertas selecionadas"><p role="status"><strong>{selected.length}</strong> {selected.length===1?'oferta selecionada':'ofertas selecionadas'}</p><Button disabled={disabled} onClick={()=>show(true)}>Agendar grupo</Button><Button variant="ghost" onClick={clearSelection}>Limpar</Button></div>:null}
    {open?<DayPlanDialog segmentName={segmentName} key={id??(manual?'manual':'auto')} base={base} initialId={id} selected={manual?selected:undefined} onClose={()=>{setOpen(false);setRevision(v=>v+1)}} onChanged={()=>{onChanged();setRevision(v=>v+1)}} clearSelection={clearSelection} returnFocusTo={trigger.current}/>:null}
  </>
}

function DayPlanDialog({base,segmentName,initialId,selected,onClose,onChanged,clearSelection,returnFocusTo}:{base:string;segmentName:string;initialId:string|null;selected?:DiscoveryProduct[];onClose:()=>void;onChanged:()=>void;clearSelection:()=>void;returnFocusTo:HTMLElement|null}){
  const [retryProducts,setRetryProducts]=useState<DiscoveryProduct[]|null>(null)
  const chosen=retryProducts??selected
  const christmas=/\b(?:natal|natalino|natalina|christmas|xmas)\b/i.test(segmentName)
  const [includeGiftIdeas,setIncludeGiftIdeas]=useState(false)
  const [defaults]=useState(()=>dayPlanDefaults())
  const [id,setId]=useState(initialId),[plan,setPlan]=useState<DayPlan|null>(null),[day,setDay]=useState(defaults.day),[start,setStart]=useState(defaults.start),[end,setEnd]=useState(defaults.end),[count,setCount]=useState(12),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[cancelConfirm,setCancelConfirm]=useState(false),[now,setNow]=useState(Date.now())
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
    const input={day,start,end,count:chosen?.length??count,...(christmas&&!chosen?{includeGiftIdeas}:{}),...(chosen?{itemIds:chosen.map(p=>p.id)}:{})}
    const serialized=JSON.stringify(input)
    if(requestKey.current?.input!==serialized)requestKey.current={input:serialized,key:crypto.randomUUID()}
    try{const value=await affiliateRequest<{id:string}>(base,'POST',{...input,idempotencyKey:requestKey.current!.key});if(mounted.current){setId(value.id);onChanged()}}
    catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Não foi possível preparar. Tente novamente.')}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  async function mutate(path:string,body?:unknown,method='POST'){
    if(lock.current||!id)return
    lock.current=true;setBusy(true);setError('')
    try{await affiliateRequest(base+'/'+encodeURIComponent(id)+path,method,body);if(mounted.current){setReload(v=>v+1);onChanged();if(path==='/approve'){clearSelection()}if(path==='/retry')setPlan(previous=>previous?{...previous,status:'BUILDING'}:previous);setCancelConfirm(false)}}
    catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Não foi possível salvar. Confira a agenda antes de repetir.')}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  function retryFailed(entryId?:string){
    if(busy||!plan)return
    const failed=plan.entries.filter(e=>e.state==='FAILED'&&(!entryId||e.id===entryId))
    if(plan.status!=='APPROVED'&&failed.every(e=>Date.parse(e.scheduledAt)>Date.now()+60000)){void mutate('/retry',entryId?{entryId}:{});return}
    const products=failed.flatMap(e=>e.product?[{...e.product,id:e.itemId}]:[])
    if(!products.length){setError('Atualize os produtos antes de conferir este lote.');return}
    const next=dayPlanDefaults();setRetryProducts(products);setId(null);setPlan(null);setDay(next.day);setStart(next.start);setEnd(next.end);setError('');requestKey.current=null
  }
  const expired=!!plan&&Date.parse(plan.expiresAt)<=now,quantity=chosen?.length??count
  const interval=quantity>1?Math.floor(((Number(end.slice(0,2))*60+Number(end.slice(3)))-(Number(start.slice(0,2))*60+Number(start.slice(3))))/(quantity-1)):null
  return <OverlayDialog open title={plan?.status==='APPROVED'?'Ofertas agendadas':id?'Revisar lote de ofertas':chosen?'Agendar ofertas selecionadas':'Planejar ofertas do dia'} size="wide" onClose={()=>{if(!busy)onClose()}} closeDisabled={busy} returnFocusTo={returnFocusTo}>
    {error?<p role="alert" className={common.error}>{error}{id?<Button variant="secondary" onClick={()=>setReload(v=>v+1)}>Tentar carregar novamente</Button>:null}</p>:null}
    {!id?<form className={styles.form} onSubmit={event=>void generate(event)}>
      {retryProducts?<p>As ofertas que falharam serão conferidas em um novo lote. Escolha o horário e revise antes de aceitar.</p>:null}
      <p>{chosen?`${chosen.length} ofertas escolhidas por você.`:'A IA escolhe produtos diferentes, priorizando descontos e os menos enviados.'}</p>
      {christmas&&!chosen?<><p>Somente produtos natalinos por padrão.</p><label className={styles.giftChoice}><input type="checkbox" checked={includeGiftIdeas} onChange={event=>setIncludeGiftIdeas(event.target.checked)}/><span>Incluir algumas ideias de presente</span></label><p className={common.muted}>Até 20% de presentes, intercalados com itens de Natal. A chamada apresenta a ideia de presente.</p></>:null}
      <label>Dia<input required type="date" value={day} min={brDay(new Date())} max={brDay(new Date(Date.now()+30*86400000))} onChange={e=>setDay(e.target.value)}/></label>
      <div className={styles.fields}><label>Começa às<input required type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Termina às<input required type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
      {!chosen?<label>Ofertas no dia<input required type="number" min={1} max={24} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>:null}
      <p className={styles.summary}><strong>{dayPlanDateLabel(day,new Date(now))} · {start}–{end} · Brasília</strong><span>{quantity} ofertas por grupo{interval!==null?` · cerca de ${interval} min entre ofertas`:''}</span><span>Você revisa as mensagens e os destinos antes de aceitar.</span></p>
      {quantity>24||quantity<1?<p role="status" className={common.warning}>Escolha de 1 a 24 ofertas por lote.</p>:interval!==null&&interval<15?<p role="status" className={common.warning}>Amplie o período ou reduza as ofertas: o intervalo mínimo é de 15 minutos.</p>:null}
      <Button type="submit" loading={busy} disabled={busy||quantity<1||quantity>24||!!chosen&&!chosen.length||interval!==null&&interval<15}>Gerar prévia do lote</Button>
    </form>:!plan?<p role="status">Carregando lote…</p>:<div className={styles.review}>
      {plan.status==='BUILDING'?<p role="status">Preparando fotos, preços e links… Você pode fechar e retomar pela Agenda.</p>:null}
      {plan.error?<p role="alert" className={common.warning}>{plan.error}</p>:null}
      {plan.status!=='BUILDING'?<><div className={styles.summary}><strong>{plan.summary.offers} {plan.summary.offers===1?'oferta · 1 mensagem':'ofertas · '+plan.summary.offers+' mensagens'} por grupo</strong><span>{plan.summary.groups} {plan.summary.groups===1?'grupo':'grupos'} · {plan.summary.totalMessages} mensagens neste lote</span><span>{planCadence(plan)}</span>{plan.dailyByGroup?.length?<span>Total do dia: {Math.min(...plan.dailyByGroup.map(g=>g.messages))===Math.max(...plan.dailyByGroup.map(g=>g.messages))?plan.dailyByGroup[0].messages:`${Math.min(...plan.dailyByGroup.map(g=>g.messages))} a ${Math.max(...plan.dailyByGroup.map(g=>g.messages))}`} mensagens por grupo.</span>:null}</div>
        <details><summary className={styles.detailsSummary}>Destinos e total de mensagens no dia</summary><ul>{plan.groups.map(g=><li key={g.id}>{g.name}{plan.dailyByGroup?` · ${plan.dailyByGroup.find(d=>d.id===g.id)?.messages??0} mensagens no dia, incluindo este lote`:''}</li>)}</ul></details>
        {plan.mode==='AUTO'?<p className={common.muted}>{plan.source==='OPENAI'?'Sequência organizada com IA.':'Sequência organizada por desconto e histórico; IA indisponível nesta geração.'}</p>:null}
        </>:null}
      <ol className={styles.entries}>{plan.entries.filter(e=>e.state!=='CANCELLED').map(entry=><li key={entry.id} className={styles.entry}>
        <div className={styles.entryTop}><time dateTime={entry.scheduledAt}>{brTime(entry.scheduledAt)}</time><span>{entry.counts?.length?entry.counts.map(c=>`${c.count} ${deliveryLabels[c.state]??c.state}`).join(' · '):labels[entry.state]??entry.state}</span>{entry.kind==='GIFT'?<span>Ideia de presente</span>:null}</div>
        <div className={styles.product}>{entry.product?<ProductImage src={entry.product.imageUrl} title={entry.title}/>:<div aria-hidden="true"/>}<div><strong>{entry.title}</strong>{entry.product?<p><b>{formatCents(entry.product.priceCents)}</b>{entry.product.reportedDiscountPercent?` · ${entry.product.reportedDiscountPercent}% OFF`:entry.product.oldPriceCents&&entry.product.oldPriceCents>entry.product.priceCents?` · ${Math.floor((1-entry.product.priceCents/entry.product.oldPriceCents)*100)}% OFF`:''}</p>:null}<span className={common.muted}>{entry.sentCount??0} {entry.sentCount===1?'envio anterior':'envios anteriores'}</span></div></div>
        {entry.error?<p className={common.warning}>{entry.error}</p>:null}
        {entry.product&&entry.state==='FAILED'?<p className={common.muted}>Foto e preço da coleta. Esta oferta não está incluída no agendamento.</p>:null}
        <div className={styles.entryActions}>{entry.message?<details><summary className={styles.detailsSummary}>Ver mensagem e link</summary><pre className={styles.message}>{entry.message}</pre></details>:null}
        {['DRAFT','FAILED','APPROVED'].includes(plan.status)&&entry.state==='FAILED'?<Button variant="secondary" disabled={busy} onClick={()=>retryFailed(entry.id)} aria-label={'Verificar novamente: '+entry.title}>Verificar novamente</Button>:null}
        {plan.status==='DRAFT'&&entry.state==='READY'?<Button variant="ghost" disabled={busy} onClick={()=>void mutate('/entries/'+encodeURIComponent(entry.id),undefined,'DELETE')} aria-label={'Remover do lote: '+entry.title}>Remover</Button>:null}</div>
      </li>)}</ol>
      {plan.status!=='BUILDING'?<details><summary className={styles.detailsSummary}>Como funciona o envio</summary><p className={common.muted}>Cada oferta entra na fila no horário mostrado e segue para os grupos. O tempo de entrega depende das conexões, com tolerância de 30 minutos. Mudança de preço bloqueia a oferta para revisão.</p></details>:null}
      {plan.status==='DRAFT'&&expired?<p role="alert" className={common.warning}>Este rascunho expirou. Feche e gere outro lote para reconferir os preços.</p>:null}
      <div className={styles.footer}>
        {['DRAFT','FAILED','APPROVED'].includes(plan.status)&&plan.entries.some(e=>e.state==='FAILED')?<Button variant="secondary" disabled={busy} onClick={()=>retryFailed()}>Verificar falhas</Button>:null}
        {plan.status==='DRAFT'?<Button disabled={busy||expired||!plan.summary.offers} loading={busy} onClick={()=>void mutate('/approve',{confirm:true})}>Aceitar e agendar {plan.summary.offers} {plan.summary.offers===1?'oferta':'ofertas'}</Button>:null}
        {['BUILDING','DRAFT'].includes(plan.status)?<Button variant="ghost" disabled={busy} onClick={()=>void mutate('/cancel',{confirm:true})}>Descartar lote</Button>:null}
        {plan.status==='APPROVED'?cancelConfirm?<><p>Cancelar os envios pendentes? Mensagens já enviadas ou em processamento não serão desfeitas.</p><Button variant="danger" disabled={busy} onClick={()=>void mutate('/cancel',{confirm:true})}>Confirmar cancelamento das pendências</Button><Button variant="ghost" onClick={()=>setCancelConfirm(false)}>Voltar</Button></>:<Button variant="secondary" disabled={busy} onClick={()=>setCancelConfirm(true)}>Cancelar pendências</Button>:null}
        <Button variant="secondary" disabled={busy} onClick={onClose}>Fechar</Button>
      </div>
    </div>}
  </OverlayDialog>
}
