'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {Field,Input,Select} from '@/components/ui/input'
import {ActionIcon} from '@/components/ui/action-icon'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {ErrorState} from '@/components/feedback/error-state'
import {EmptyState} from '@/components/feedback/empty-state'
import {Skeleton,SkeletonButton,SkeletonRegion} from '@/components/feedback/skeleton'
import {api} from '@/lib/api'
import type {InteractionReport,MeasurementPreference} from './interaction-contract'
import styles from './interaction.module.css'
async function request<T>(path:string,init?:RequestInit){const result=await api<T&{message?:string}>('/v1/me/profile/'+path,init).catch(()=>{throw new Error('Sem conexão. Tente novamente.')});if(result.status!==200)throw Object.assign(new Error(result.body.message??'Não foi possível carregar as métricas.'),{status:result.status});return result.body}
function Metrics({report,pending=false}:{report:InteractionReport|null;pending?:boolean}){
 const value=(number:number|null|undefined)=>pending?<Skeleton width="4rem" height="1.8rem"/>:number===null||number===undefined?'Indisponível':number.toLocaleString('pt-BR')
 return <div className={styles.results}>
  <div className={styles.totals}>{[['Visitas medidas',report?.summary.pageViews],['Sessões diárias',report?.summary.available?report.summary.sessions:null]].map(([label,count])=><article className={styles.card} key={String(label)}><h2>{label}</h2><div className={styles.number}>{value(count as number|null|undefined)}</div></article>)}</div>
  <section className={styles.card} aria-label="Alcance de rolagem"><h2>Até onde a página foi vista</h2><p className={styles.hint}>Alcance da tela não comprova leitura.</p><div className={styles.reach}>{(report?.summary.scrollBuckets??[25,50,75,100].map(threshold=>({threshold,label:threshold+'% da página alcançada',reached:null}))).map(row=><div key={row.threshold}><span>{row.threshold}%</span><div className={styles.track} aria-hidden="true">{pending?<Skeleton height=".65rem"/>:<span data-reach-bar style={{width:row.reached!==null&&report?.summary.sessions?Math.min(100,row.reached/report.summary.sessions*100)+'%':'0%'}}/>}</div><span aria-label={row.label}>{value(row.reached)}</span></div>)}</div></section>
  {(!report||report.summary.available)?<section className={styles.blocks} aria-label="Interação dos links">{(report?.summary.blocks??Array.from({length:3},(_,index)=>({id:String(index),label:'',impressions:null,clicks:null,ctr:null}))).map(block=><article key={block.id} className={styles.card}><h2>{pending?<Skeleton width="60%" height="1.4rem"/>:block.label}</h2><dl className={styles.metrics}>{[['Visualizações',block.impressions],['Cliques',block.clicks],['Taxa de cliques',block.ctr]].map(([label,count])=><div key={String(label)}><dt>{label}</dt><dd>{value(count as number|null)}{!pending&&count!==null&&label==='Taxa de cliques'?'%':''}</dd></div>)}</dl></article>)}</section>:null}
 </div>
}
export function InteractionScreen({pendingOnly=false}:{pendingOnly?:boolean}={}){
 const [preference,setPreference]=useState<MeasurementPreference|null>(null),[report,setReport]=useState<InteractionReport|null>(null),[from,setFrom]=useState(''),[to,setTo]=useState(''),[revision,setRevision]=useState(''),[viewport,setViewport]=useState('ALL')
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[applied,setApplied]=useState(''),[refresh,setRefresh]=useState(0)
 const [missing,setMissing]=useState(false)
 const sequence=useRef(0),busy=useRef(false)
 const load=useCallback(async()=>{
  const id=++sequence.current;setLoading(true);setError('');setMissing(false);let preferenceRead=false
  try{const pref=await request<MeasurementPreference>('measurement');if(id!==sequence.current)return;preferenceRead=true;setPreference(pref)
   if(pref.allowed){const next=await request<InteractionReport>('interaction'+(applied?'?'+applied:''));if(id===sequence.current){setReport(next);if(!applied){setFrom(next.range.from);setTo(next.range.to)}}}else setReport(null)
  }catch(reason){if(id===sequence.current){if(reason instanceof Error&&'status' in reason&&reason.status===404&&!preferenceRead){setMissing(true);setPreference(null);setReport(null)}else setError(reason instanceof Error?reason.message:'Não foi possível carregar as métricas.')}}
  finally{if(id===sequence.current)setLoading(false)}
 },[applied])
 useEffect(()=>{if(!pendingOnly)void load();return()=>{sequence.current++}},[load,refresh,pendingOnly])
 async function toggle(){if(!preference||busy.current)return;busy.current=true;setSaving(true);setError('');setNotice('')
  try{const next=await request<MeasurementPreference>('measurement',{method:'PATCH',body:JSON.stringify({enabled:!preference.enabled,expectedVersion:preference.version})});setPreference(next);setNotice(next.enabled?'Medição ativada para visitantes que aceitarem cookies.':'Medição pausada. Nenhuma nova visita será medida.')}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar.')}
  finally{busy.current=false;setSaving(false)}
 }
 return <section className={styles.page} aria-label="Métricas da minha página" aria-busy={loading}>
  <WorkspaceActions label="Ações das métricas"><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink><Button aria-label="Atualizar métricas" disabled={loading||saving} variant="secondary" onClick={()=>setRefresh(value=>value+1)}><ActionIcon name="refresh"/></Button>{loading&&!preference?<SkeletonButton/>:preference&&(preference.allowed||preference.enabled)?<Button loading={saving} disabled={loading||saving} onClick={()=>void toggle()}><ActionIcon name={preference.enabled?'pauseMeasurement':'check'}/>{preference.enabled?'Pausar medição':'Ativar medição'}</Button>:null}{(loading&&!preference)||preference?.allowed?<Button type="submit" form="profile-interaction-filters" disabled={loading}><ActionIcon name="search"/>Aplicar filtros</Button>:null}</WorkspaceActions>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status">{notice}</p>:null}
  {missing?<EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="profile"/>Criar minha página</ButtonLink>}>Crie sua página para acompanhar as métricas.</EmptyState>:preference&&!preference.allowed?<EmptyState>Seu plano não inclui métricas da página.</EmptyState>:loading||preference?<>
   <WorkspaceFilters id="profile-interaction-filters" label="Filtrar métricas" onSubmit={event=>{event.preventDefault();const params=new URLSearchParams();if(from)params.set('from',from);if(to)params.set('to',to);if(revision)params.set('revision',revision);params.set('viewport',viewport);setApplied(params.toString());setRefresh(value=>value+1)}}>
    <Field label="De"><Input disabled={loading} type="date" value={from} max={to||undefined} onChange={event=>setFrom(event.target.value)}/></Field><Field label="Até"><Input disabled={loading} type="date" min={from||undefined} value={to} onChange={event=>setTo(event.target.value)}/></Field>
    <Field label="Publicação"><Select value={revision} onChange={event=>setRevision(event.target.value)} disabled={loading}><option value="">Publicação atual</option>{report?.revisions.map(version=><option key={version} value={String(version)}>Versão {version}</option>)}</Select></Field>
    <Field label="Tela do visitante"><Select disabled={loading} value={viewport} onChange={event=>setViewport(event.target.value)}><option value="ALL">Todas</option><option value="MOBILE">Celular</option><option value="TABLET">Tablet</option><option value="DESKTOP">Computador</option></Select></Field>
   </WorkspaceFilters>
   <p className={styles.hint}>{loading&&!preference?<Skeleton width="7rem"/>:preference?.enabled?'Medição ativa.':'Medição pausada.'} Apenas visitas com consentimento. Mínimo de 10 sessões diárias; retenção de 180 dias. Não representa pessoas únicas.</p>
   {report&&!report.summary.available&&!error?<EmptyState>Ainda não há dados suficientes para este período e filtro.</EmptyState>:null}
   {loading?<SkeletonRegion label="Carregando métricas"><Metrics report={report} pending/></SkeletonRegion>:!error&&report?<Metrics report={report}/>:null}
  </>:null}
 </section>
}



