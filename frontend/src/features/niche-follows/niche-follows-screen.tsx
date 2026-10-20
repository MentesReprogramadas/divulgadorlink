'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,Input,Select} from '@/components/ui/input'
import {RefreshButton} from '@/components/layout/workspace-actions'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {nicheRequest,type NicheFollowState} from './niche-follows-api'
import styles from './niche-follows.module.css'
export function NicheFollowsScreen({pendingOnly=false}:{pendingOnly?:boolean}){
 const [state,setState]=useState<NicheFollowState|null>(null),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[open,setOpen]=useState(false),[enabled,setEnabled]=useState(false),[frequency,setFrequency]=useState('WEEKLY'),[formError,setFormError]=useState('')
 const busy=useRef(false),trigger=useRef<HTMLButtonElement>(null)
 const load=useCallback(async()=>{if(pendingOnly)return;setLoading(true);setError('');try{setState(await nicheRequest('me/followed-niches'))}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar.')}finally{setLoading(false)}},[pendingOnly])
 useEffect(()=>{void load()},[load])
 async function follow(row:NicheFollowState['niches'][number]){
  if(busy.current)return
  busy.current=true;setPending(true);setError('');setNotice('')
  try{setState(await nicheRequest('me/followed-niches/'+encodeURIComponent(row.id),{method:row.followed?'DELETE':'PUT'}));setNotice(row.followed?'Você deixou de seguir '+row.name+'.':'Você está seguindo '+row.name+'.')}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível alterar.')}
  finally{busy.current=false;setPending(false)}
 }
 async function save(value=enabled){
  if(busy.current||!state)return
  busy.current=true;setPending(true);setFormError('')
  try{setState(await nicheRequest('me/niche-digest-preferences',{method:'PATCH',body:JSON.stringify({emailDigest:value,frequency:open?frequency:state.preferences.frequency,expectedVersion:state.preferences.expectedVersion})}));setOpen(false);setNotice(value?'Resumos ativados.':'Resumos desativados.')}
  catch(reason){const message=reason instanceof Error?reason.message:'Não foi possível salvar.';if(open)setFormError(message);else setError(message)}
  finally{busy.current=false;setPending(false)}
 }
 const skeleton=pendingOnly||loading,disabled=skeleton||pending
 const rows=state?.niches??[],visible=rows.filter(row=>row.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))&&(filter==='all'||filter==='followed'&&row.followed||filter==='available'&&!row.followed))
 return <section className={styles.page} aria-label="Categorias seguidas" aria-busy={skeleton||pending}>
  <div className={styles.actions}><RefreshButton disabled={disabled} onClick={()=>void load()}/></div>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status" className={styles.status}>{notice}</p>:null}
  <div className={styles.summary} data-enabled={state?.preferences.emailDigest||undefined} aria-busy={skeleton}>
   <div className={styles.digestState} aria-hidden={skeleton||undefined}><span className={styles.digestIcon}><ActionIcon name={state?.preferences.emailDigest?'bell':'disable'}/></span><div><strong className={skeleton?styles.placeholder:undefined}>{state?.preferences.emailDigest?'Resumos por e-mail ativados':'Resumos por e-mail desativados'}</strong><p>{state?.preferences.emailDigest?(state.preferences.frequency==='MONTHLY'?'Mensal · a cada 30 dias':'Semanal · a cada 7 dias'):'Receba novidades das categorias que você segue.'}</p></div></div>
   <div className={styles.actions}>{state?.preferences.emailDigest?<Button variant="secondary" disabled={disabled} onClick={()=>{setEnabled(true);setFrequency(state.preferences.frequency);setFormError('');setOpen(true)}}><ActionIcon name="settings"/>Frequência</Button>:null}<Button ref={trigger} variant={state?.preferences.emailDigest?'secondary':'primary'} disabled={disabled||!state} loading={pending} onClick={()=>{if(!state)return;if(state.preferences.emailDigest){void save(false);return}setEnabled(true);setFrequency(state.preferences.frequency);setFormError('');setOpen(true)}}><ActionIcon name={state?.preferences.emailDigest?'disable':'bell'}/>{state?.preferences.emailDigest?'Desativar resumos':'Ativar resumos'}</Button></div>
  </div>
  <div className={styles.filters}><Field label="Buscar categoria"><Input value={query} disabled={disabled} placeholder="Ex.: estudos" onChange={event=>setQuery(event.target.value)}/></Field><Field label="Mostrar"><Select value={filter} disabled={disabled} onChange={event=>setFilter(event.target.value)}><option value="all">Todas as categorias</option><option value="followed">Que eu sigo</option><option value="available">Que ainda não sigo</option></Select></Field></div>
  <ul className={styles.list}>{(skeleton?(state?.niches??[0,1,2].map(i=>({id:String(i),name:'Categoria',followed:false}))):visible).map(row=><li key={row.id} aria-hidden={skeleton||undefined} inert={skeleton||undefined}><article className={styles.card}><div className={styles.nameWrap}><h2 className={[styles.name,skeleton?styles.placeholder:''].join(' ')}>{row.name}</h2></div><Button variant={row.followed?'secondary':'primary'} disabled={disabled} aria-pressed={row.followed} aria-label={(row.followed?'Deixar de seguir ':'Seguir ')+row.name} onClick={()=>void follow(row)}><ActionIcon name={row.followed?'disable':'followNiche'}/>{row.followed?'Deixar de seguir':'Seguir'}</Button></article></li>)}</ul>
  {!skeleton&&!visible.length&&!error?<EmptyState>{rows.length?'Nenhuma categoria com estes filtros.':'Nenhuma categoria disponível.'}</EmptyState>:null}
  <OverlayDialog open={open} title="Resumo por e-mail" onClose={()=>{if(!pending)setOpen(false)}} closeDisabled={pending} returnFocusTo={trigger.current}>
   <form className={styles.form} onSubmit={event=>{event.preventDefault();void save()}}><label className={styles.check}><input type="checkbox" checked={enabled} disabled={pending} onChange={event=>setEnabled(event.target.checked)} aria-describedby="digest-hint"/>Receber novidades das categorias que sigo</label><p id="digest-hint">Somente conteúdo geral e e-mail confirmado. Seguir uma categoria não ativa os envios.</p><Field label="Frequência"><Select value={frequency} disabled={pending} onChange={event=>setFrequency(event.target.value)}><option value="WEEKLY">Semanal · a cada 7 dias</option><option value="MONTHLY">Mensal · a cada 30 dias</option></Select></Field>{formError?<p role="alert">{formError}</p>:null}<div className={styles.actions}><Button type="submit" disabled={pending} loading={pending}><ActionIcon name="save"/>Salvar preferência</Button></div></form>
  </OverlayDialog>
 </section>
}
