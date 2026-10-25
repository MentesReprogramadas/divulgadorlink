'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {paywallPath} from '@/features/profile-billing/billing-access'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,Select} from '@/components/ui/input'
import {Badge} from '@/components/ui/badge'
import {MetricCards} from '@/components/ui/metric-cards'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {RefreshButton} from '@/components/layout/workspace-actions'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {Skeleton,SkeletonButton,SkeletonField,SkeletonRegion} from '@/components/feedback/skeleton'
import {useWorkspaceIdentity} from '@/features/workspace-team/workspace-access'
import {profileRequest,ProfileRequestError} from '@/features/profiles/profile-api'
import styles from './diagnostics.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
type Finding={key:string;code:string;title:string;reason:string;actionPath:string;actionLabel:string;position:number|null;ruleVersion:number;evidence:{impressions?:number;clicks?:number;count?:number;revision?:number;checkedAt?:string}}
type Diagnostics={page:{id:string;name:string;version:number}|null;findings:Finding[];ignored:number;coverage:string;range:{from:string;to:string}|null;revision:number|null;unverifiedUrls:number}
const labels:Record<string,string>={DUPLICATE_TITLE:'Títulos',UNAVAILABLE_LINK:'Destinos',MANY_BUTTONS:'Organização',LOW_INTERACTION:'Interação'}
const coverage:Record<string,string>={NO_PLAN:'As sugestões de interação precisam de um plano com métricas.',PAUSED:'Ative a medição para analisar a interação.',NO_PERMISSION:'Seu acesso permite revisar a página, mas não consultar métricas.',NO_DATA:'Ainda não há dados suficientes para avaliar a interação.',AVAILABLE:'Interação baseada nas visitas com consentimento do período.'}
export function DiagnosticsSkeleton({bodyOnly=false}:{bodyOnly?:boolean}){return <SkeletonRegion label="Carregando sugestões"><div className={styles.page}>{!bodyOnly?<><WorkspaceActions><SkeletonButton/><Skeleton width={44} height={44}/></WorkspaceActions><WorkspaceFilters label="Filtrar sugestões"><SkeletonField label="Período da interação"/><SkeletonField label="Tipo de melhoria"/></WorkspaceFilters></>:null}<MetricCards items={[{label:'Sugestões para revisar',value:<Skeleton width={40} height={32}/>},{label:'Ignoradas nesta versão',value:<Skeleton width={40} height={32}/>}]}/>{[1,2].map(id=><div className={styles.card} key={id}><Skeleton width="60%" height={26}/><Skeleton width="100%" height={55}/>{id===2?<WorkspaceActions><SkeletonButton/><SkeletonButton/></WorkspaceActions>:null}<LiquidLens radius={16} /></div>)}</div></SkeletonRegion>}
export function diagnosticPeriod(days:number,now=new Date()){
 const to=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),from=new Date(to+'T12:00:00Z');from.setUTCDate(from.getUTCDate()-days+1);return{from:from.toISOString().slice(0,10),to}
}
export function DiagnosticsScreen(){const identity=useWorkspaceIdentity();return <ScopedDiagnostics key={identity?.ownerId??'self'} writable={!identity?.ownerId||identity.grants?.page?.write===true}/>}
function ScopedDiagnostics({writable}:{writable:boolean}){
 const workspace=useWorkspaceIdentity(),canSeeBilling=!workspace?.ownerId||workspace.grants?.billing?.read===true
 const [data,setData]=useState<Diagnostics|null>(null),[days,setDays]=useState('30'),[kind,setKind]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState<string|null>(null),sequence=useRef(0)
 const range=useCallback(()=>{return diagnosticPeriod(Number(days))},[days])
 const load=useCallback(async()=>{const current=++sequence.current;setLoading(true);setError('');try{const next=await profileRequest<Diagnostics>('/diagnostics?'+new URLSearchParams(range()));if(current===sequence.current)setData(next)}catch(reason){if(current!==sequence.current)return;if(reason instanceof ProfileRequestError&&[401,403].includes(reason.status))setData(null);setError(reason instanceof Error?reason.message:'Não foi possível carregar as sugestões.')}finally{if(current===sequence.current)setLoading(false)}},[range])
 useEffect(()=>{void load();return()=>{sequence.current++}},[load])
 async function dismiss(finding:Finding){if(pending)return;setPending(finding.key);setNotice('');setError('');try{await profileRequest('/diagnostics/'+finding.key+'/dismiss',{method:'POST',body:JSON.stringify({ruleVersion:finding.ruleVersion,...range()})});setNotice('Sugestão ignorada por até 30 dias. Sua página não foi alterada.');await load()}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível ignorar.')}finally{setPending(null)}}
 if(!data&&loading)return <DiagnosticsSkeleton/>
 if(!data)return <ErrorState readOnlyAllowed message={error} onRetry={()=>void load()}/>
 if(!data.page)return <EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="createPage"/>Criar minha página</ButtonLink>}>Crie sua página para receber sugestões de melhoria.</EmptyState>
 const shown=data.findings.filter(row=>!kind||row.code===kind)
 return <div className={styles.page}><WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil/previa"><ActionIcon name="preview"/>Ver minha página</ButtonLink><RefreshButton disabled={loading||!!pending} onClick={()=>void load()}/></WorkspaceActions>
 <WorkspaceFilters label="Filtrar sugestões"><Field label="Período da interação"><Select value={days} disabled={!!pending} onChange={e=>setDays(e.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></Select></Field><Field label="Tipo de melhoria"><Select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Todas as sugestões</option>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</Select></Field></WorkspaceFilters>
 {error?<ErrorState readOnlyAllowed message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status">{notice}</p>:null}
 {loading?<DiagnosticsSkeleton bodyOnly/>:<><MetricCards items={[{label:'Sugestões para revisar',value:data.findings.length,primary:true},{label:'Ignoradas nesta versão',value:data.ignored}]}/>
 <section className={styles.card} aria-label="O que foi analisado"><h2>{data.page.name}</h2><p>Textos e organização do rascunho salvo.{data.revision!==null?` Interação da publicação ${data.revision}.`:''}</p><p className={styles.hint}>{coverage[data.coverage]??'Sem análise de interação.'}{data.unverifiedUrls>0?` ${data.unverifiedUrls===1?'Um destino próprio não tem':data.unverifiedUrls+' destinos próprios não têm'} checagem automática de disponibilidade.`:''}</p>{['PAUSED','NO_PLAN'].includes(data.coverage)&&(data.coverage!=='NO_PLAN'||canSeeBilling)?<WorkspaceActions><ButtonLink href={data.coverage==='NO_PLAN'?paywallPath('profile.analytics'):'/painel/perfil/metricas'}><ActionIcon name={data.coverage==='NO_PLAN'?'subscriptionLock':'interaction'}/>{data.coverage==='NO_PLAN'?'Ver meu plano':'Ver medição da página'}</ButtonLink></WorkspaceActions>:null}<LiquidLens radius={16} /></section>
 {shown.length?<div className={styles.page}>{shown.map(row=><article className={styles.card} key={row.key} aria-label={row.title}><Badge tone={row.code==='UNAVAILABLE_LINK'?'warn':'neutral'}>{labels[row.code]}</Badge><h2>{row.title}</h2><p>{row.reason}</p>{row.evidence.impressions!==undefined?<dl className={styles.evidence}><div><dt>Visualizações do botão</dt><dd>{row.evidence.impressions}</dd></div><div><dt>Cliques</dt><dd>{row.evidence.clicks}</dd></div><div><dt>Ordem na publicação</dt><dd>{row.position}</dd></div></dl>:null}{row.evidence.checkedAt?<p className={styles.hint}>Última checagem: {new Date(row.evidence.checkedAt).toLocaleDateString('pt-BR')}</p>:null}<WorkspaceActions>{writable?<ButtonLink href={row.actionPath}><ActionIcon name="edit"/>{row.actionLabel}</ButtonLink>:null}{writable?<Button variant="secondary" disabled={!!pending} loading={pending===row.key} onClick={()=>void dismiss(row)}><ActionIcon name="close"/>Ignorar sugestão</Button>:null}</WorkspaceActions><LiquidLens radius={16} /></article>)}</div>:<EmptyState>{kind?'Nenhuma sugestão deste tipo.':'Nenhuma sugestão nesta versão.'}</EmptyState>}</>}
 </div>
}
