'use client'
import {useEffect,useState} from 'react'
import {Field,Select} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {api} from '@/lib/api'
import {WorkspaceFilters} from '@/components/layout/workspace-controls'
import {CityPicker} from './city-picker'
import type {DiscoveryOptions,DiscoveryValues} from './discovery-contract'
import styles from './discovery.module.css'
export function DiscoveryFields({value,onChange,disabled=false,mode='editor'}:{value:DiscoveryValues;onChange:(value:DiscoveryValues)=>void;disabled?:boolean;mode?:'editor'|'filters'}){
 const [languages,setLanguages]=useState<DiscoveryOptions['languages']>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let live=true;setLoading(true);setError(false);void api<DiscoveryOptions>('/v1/catalog/discovery-options').then(result=>{if(result.status!==200)throw Error();if(live){setLanguages(result.body.languages);setLoading(false)}}).catch(()=>{if(live){setError(true);setLoading(false)}});return()=>{live=false}},[attempt])
 const fields=[
  <Field key="city" label="Cidade no Brasil" icon={<ActionIcon name="city"/>} hint={mode==='editor'?'Opcional. Local da comunidade ou atividade, sem endereço pessoal.':undefined}><CityPicker value={value.cityId} disabled={disabled} onChange={cityId=>onChange({...value,cityId})}/></Field>,
  <Field key="language" label="Idioma principal" icon={<ActionIcon name="language"/>}><Select disabled={disabled||loading||error} value={value.languageTag??''} onChange={event=>onChange({...value,languageTag:event.target.value||null})}><option value="">{loading?'Carregando idiomas…':mode==='filters'?'Todos os idiomas':'Não informado'}</option>{languages.map(language=><option key={language.code} value={language.code}>{language.name}</option>)}</Select></Field>,
  <Field key="modality" label="Forma de participação" icon={<ActionIcon name="modality"/>}><Select disabled={disabled} value={value.modality??''} onChange={event=>onChange({...value,modality:(event.target.value||null) as DiscoveryValues['modality']})}><option value="">{mode==='filters'?'Todas as formas':'Não informado'}</option><option value="ONLINE">Online</option><option value="PRESENTIAL">Presencial</option></Select></Field>,
  error?<div key="error" className={styles.feedback} role="alert">Não foi possível carregar os idiomas.<Button type="button" onClick={()=>setAttempt(value=>value+1)}><ActionIcon name="refresh"/>Tentar de novo</Button></div>:null
 ]
 return mode==='filters'?<WorkspaceFilters label="Filtros de local e idioma">{fields}</WorkspaceFilters>:<div className={styles.fields}>{fields}</div>
}
