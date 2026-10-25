'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ActionIcon } from '@/components/ui/action-icon'
import { SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import { ErrorState } from '@/components/feedback/error-state'
import { directoryRequest, type DiscoverySettings as Settings } from './discovery-api'
import styles from './discovery.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function DiscoverySettings({ ready }: { ready: boolean }) {
  const [state,setState]=useState<Settings|null>(null),[error,setError]=useState(''),[saved,setSaved]=useState(false),[pending,setPending]=useState(false)
  const busy=useRef(false)
  const load=useCallback(async()=>{setError('');try{setState(await directoryRequest<Settings>('me/profile/discovery'))}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar.')}},[])
  useEffect(()=>{void load()},[load])
  async function save(){if(!state||busy.current)return;busy.current=true;setPending(true);setError('');setSaved(false);try{await directoryRequest('me/profile/discovery',{method:'PATCH',body:JSON.stringify({enabled:state.enabled,nicheId:state.nicheId,expectedVersion:state.version})});await load();setSaved(true)}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}finally{busy.current=false;setPending(false)}}
  return <section className={styles.settings} aria-label="Descoberta da página"><h2>Encontrar minha página</h2><p>Apareça na busca de páginas quando sua publicação estiver disponível.</p>{error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{state?<><label className={styles.check}><Checkbox checked={state.enabled} disabled={!ready||pending} onChange={e=>{setState({...state,enabled:e.target.checked});setSaved(false)}}/>Mostrar na descoberta de páginas</label><Field label="Categoria da página"><Select value={state.nicheId??''} disabled={!ready||pending} onChange={e=>{setState({...state,nicheId:e.target.value||null});setSaved(false)}}><option value="">Sem categoria específica</option>{state.niches.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</Select></Field><div className={styles.actions}><Button type="button" disabled={!ready} loading={pending} onClick={()=>void save()}><ActionIcon name="save"/>Salvar descoberta</Button></div>{saved?<p role="status">Descoberta atualizada.</p>:null}{!ready?<p>Salve o nome e o endereço da página para configurar.</p>:null}</>:!error?<SkeletonRegion><SkeletonField label="Descoberta"/><SkeletonField label="Categoria da página"/></SkeletonRegion>:null}<LiquidLens radius={16} /></section>
}
