'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {ActionIcon} from '@/components/ui/action-icon'
import {Checkbox} from '@/components/ui/checkbox'
import {Field,Input} from '@/components/ui/input'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {useWorkspaceIdentity} from '@/features/workspace-team/workspace-access'
import {webhookRequest,eventLabels,type WebhookState,type WebhookEndpoint,type WebhookType} from './webhook-api'
import {WebhooksSkeleton} from './webhooks-skeleton'
import styles from './webhooks.module.css'

const statuses:Record<string,{label:string;tone:'ok'|'wait'|'warn'|'muted'}>={PENDING:{label:'Na fila',tone:'wait'},SENDING:{label:'Enviando',tone:'wait'},DELIVERED:{label:'Entregue',tone:'ok'},FAILED:{label:'Falhou',tone:'warn'},CANCELLED:{label:'Cancelada',tone:'muted'}}
const allEvents:WebhookType[]=['contact.received','link.approved','campaign.ended']
export function WebhooksScreen(){
 const identity=useWorkspaceIdentity(),writable=!identity?.ownerId||identity.grants?.integrations?.write===true
 const [state,setState]=useState<WebhookState|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false)
 const [editing,setEditing]=useState<WebhookEndpoint|'new'|null>(null),[url,setUrl]=useState(''),[events,setEvents]=useState<WebhookType[]>(allEvents),[enabled,setEnabled]=useState(true),[formError,setFormError]=useState('')
 const [secret,setSecret]=useState(''),[confirmRotate,setConfirmRotate]=useState<WebhookEndpoint|null>(null),[confirmDelete,setConfirmDelete]=useState<WebhookEndpoint|null>(null)
 const busy=useRef(false),trigger=useRef<HTMLElement|null>(null)
 const load=useCallback(async()=>{setError('');try{const next=await webhookRequest<WebhookState>('endpoints');setState(next)}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar.')}},[])
 useEffect(()=>{setState(null);setEditing(null);setSecret('');void load()},[load,identity?.ownerId])
 useEffect(()=>{if(!state?.deliveries.some(row=>row.status==='PENDING'||row.status==='SENDING'))return;const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer)},[state,load])
 function edit(value:WebhookEndpoint|'new',target:HTMLElement){trigger.current=target;setEditing(value);setUrl(value==='new'?'':value.url);setEvents(value==='new'?allEvents:value.eventTypes);setEnabled(value==='new'||value.enabled);setFormError('');setNotice('')}
 async function save(){
  if(!editing||busy.current)return
  if(!events.length){setFormError('Escolha pelo menos um aviso.');return}
  busy.current=true;setPending(true);setFormError('')
  try{const result=await webhookRequest<{secret?:string}>('endpoints'+(editing==='new'?'':'/'+editing.id),{method:editing==='new'?'POST':'PATCH',body:JSON.stringify({url,eventTypes:events,enabled,...(editing==='new'?{}:{expectedVersion:editing.version})})});setEditing(null);if(result.secret)setSecret(result.secret);setNotice('Integração salva.');await load()}
  catch(reason){setFormError(reason instanceof Error?reason.message:'Não foi possível salvar.')}
  finally{busy.current=false;setPending(false)}
 }
 async function action(row:WebhookEndpoint,kind:'disable'|'rotate-secret'|'test'){
  if(busy.current)return;busy.current=true;setPending(true);setError('');setNotice('')
  try{const result=await webhookRequest<{secret?:string}>('endpoints/'+row.id+'/'+kind,{method:'POST',body:JSON.stringify({expectedVersion:row.version})});setConfirmRotate(null);if(result.secret)setSecret(result.secret);setNotice(kind==='test'?'Teste colocado na fila. Acompanhe a entrega abaixo.':kind==='disable'?'Integração desativada.':'Chave renovada.');await load()}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível atualizar.')}
  finally{busy.current=false;setPending(false)}
 }
 async function retry(id:string){if(busy.current)return;busy.current=true;setPending(true);setError('');try{await webhookRequest('deliveries/'+id+'/retry',{method:'POST',body:'{}'});setNotice('Entrega colocada na fila.');await load()}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível repetir.')}finally{busy.current=false;setPending(false)}}
 async function remove(){if(!confirmDelete||busy.current)return;busy.current=true;setPending(true);setError('');try{await webhookRequest('endpoints/'+confirmDelete.id,{method:'DELETE',body:JSON.stringify({expectedVersion:confirmDelete.version})});setConfirmDelete(null);setNotice('Integração removida.');await load()}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível remover.')}finally{busy.current=false;setPending(false)}}
 if(!state&&!error)return <WebhooksSkeleton/>
 return <section className={styles.page} aria-label="Integrações e avisos">
  <div className={styles.actions}><Button variant="secondary" aria-label="Atualizar integrações" disabled={pending} onClick={()=>void load()}><ActionIcon name="refresh"/></Button>{writable?<Button disabled={pending||!state?.configured} onClick={event=>edit('new',event.currentTarget)}><ActionIcon name="plus"/>Nova integração</Button>:null}</div>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status" className={styles.note}>{notice}</p>:null}
  {state&&!state.configured?<p role="alert">As integrações aguardam configuração segura no servidor.</p>:null}
  {state?<><div className={styles.list}>{state.endpoints.map((row,index)=><article key={row.id} className={styles.card}>
   <div className={styles.meta}><h2>Destino {index+1}</h2><Badge kind="status" tone={row.enabled?'ok':'muted'}>{row.enabled?'Ativo':'Desativado'}</Badge></div>
   <span className={styles.url}>{row.url}</span><p className={styles.note}>{row.eventTypes.map(type=>eventLabels[type]).join(' · ')}</p>
   {writable?<div className={styles.actions}><Button variant="secondary" disabled={pending} onClick={event=>edit(row,event.currentTarget)}><ActionIcon name="edit"/>Editar</Button><Button variant="secondary" disabled={pending||!row.enabled} onClick={()=>void action(row,'test')}><ActionIcon name="sendContact"/>Testar envio</Button><Button variant="secondary" disabled={pending} onClick={event=>{trigger.current=event.currentTarget;setConfirmRotate(row)}}><ActionIcon name="access"/>Renovar chave</Button>{row.enabled?<Button variant="danger" disabled={pending} onClick={()=>void action(row,'disable')}><ActionIcon name="disable"/>Desativar</Button>:null}<Button variant="danger" disabled={pending} onClick={event=>{trigger.current=event.currentTarget;setConfirmDelete(row)}}><ActionIcon name="trash"/>Remover</Button></div>:null}
  </article>)}</div>{!state.endpoints.length?<EmptyState>Conecte um sistema para receber seus avisos automaticamente.</EmptyState>:null}
  <section className={styles.history} aria-label="Histórico de entregas"><h2>Entregas recentes</h2>{state.deliveries.map(row=>{const status=statuses[row.status]??{label:row.status,tone:'muted' as const};return <article className={styles.delivery} key={row.id}><div className={styles.meta}><h3>{eventLabels[row.type]??row.type}</h3><Badge kind="status" tone={status.tone}>{status.label}</Badge></div><p>{new Date(row.createdAt).toLocaleString('pt-BR')} · {row.attempts} de {row.budget} tentativas{row.statusCode?' · HTTP '+row.statusCode:''}</p><details><summary>Identificar evento</summary><code className={styles.url}>{row.eventId}</code></details>{writable&&row.status==='FAILED'&&row.budget<20?<div className={styles.actions}><Button disabled={pending} onClick={()=>void retry(row.id)}><ActionIcon name="refresh"/>Repetir entrega</Button></div>:null}</article>})}{!state.deliveries.length?<EmptyState>Os avisos enviados aparecerão aqui.</EmptyState>:null}</section></>:null}
  <OverlayDialog open={editing!==null} title={editing==='new'?'Nova integração':'Editar integração'} onClose={()=>{if(!pending)setEditing(null)}} returnFocusTo={trigger.current} closeDisabled={pending}>
   <form className={styles.form} onSubmit={event=>{event.preventDefault();void save()}}><Field label="Endereço que receberá os avisos" hint="URL HTTPS do seu sistema, n8n ou ferramenta de automação."><Input type="url" required maxLength={2048} placeholder="https://seu-sistema.com/avisos" value={url} onChange={event=>setUrl(event.target.value)} disabled={pending}/></Field><fieldset className={styles.checks} disabled={pending}><legend>Quais avisos enviar?</legend>{allEvents.map(type=><label key={type} className={styles.check}><Checkbox checked={events.includes(type)} onChange={event=>setEvents(values=>event.target.checked?[...values,type]:values.filter(value=>value!==type))}/>{eventLabels[type]}</label>)}</fieldset><label className={styles.check}><Checkbox checked={enabled} disabled={pending} onChange={event=>setEnabled(event.target.checked)}/>Integração ativa</label>{formError?<p role="alert">{formError}</p>:null}<div className={styles.actions}><Button type="submit" loading={pending}><ActionIcon name="save"/>Salvar integração</Button></div></form>
  </OverlayDialog>
  <OverlayDialog open={Boolean(secret)} title="Guarde a chave de assinatura" onClose={()=>setSecret('')} returnFocusTo={trigger.current}><p>A chave aparece apenas agora. Guarde no sistema que receberá os avisos.</p><code className={styles.secret}>{secret}</code><div className={styles.actions}><Button onClick={()=>void navigator.clipboard.writeText(secret).then(()=>setNotice('Chave copiada.')).catch(()=>setError('Selecione a chave e copie manualmente.'))}><ActionIcon name="copy"/>Copiar chave</Button><Button variant="secondary" onClick={()=>setSecret('')}><ActionIcon name="check"/>Já guardei</Button></div></OverlayDialog>
  <OverlayDialog open={confirmRotate!==null} title="Renovar chave de assinatura?" onClose={()=>{if(!pending)setConfirmRotate(null)}} returnFocusTo={trigger.current} closeDisabled={pending}><p>Atualize o sistema receptor com a nova chave. A anterior continuará válida nos envios por cinco minutos.</p><div className={styles.actions}><Button loading={pending} onClick={()=>{if(confirmRotate)void action(confirmRotate,'rotate-secret')}}><ActionIcon name="access"/>Renovar chave</Button></div></OverlayDialog>
  <OverlayDialog open={confirmDelete!==null} title="Remover integração?" onClose={()=>{if(!pending)setConfirmDelete(null)}} returnFocusTo={trigger.current} closeDisabled={pending}><p>Os próximos envios serão cancelados e o histórico deste destino será removido.</p><div className={styles.actions}><Button variant="danger" loading={pending} onClick={()=>void remove()}><ActionIcon name="trash"/>Remover integração</Button></div></OverlayDialog>
 </section>
}
