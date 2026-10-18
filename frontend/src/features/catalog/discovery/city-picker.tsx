'use client'
import {useEffect,useId,useRef,useState} from 'react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {api} from '@/lib/api'
import type {DiscoveryCity,DiscoveryOptions} from './discovery-contract'
import styles from './discovery.module.css'
export function CityPicker({id,value,onChange,disabled=false,invalid,'aria-describedby':describedBy}:{id?:string;value:string|null;onChange:(value:string|null)=>void;disabled?:boolean;invalid?:boolean;'aria-describedby'?:string}){
 const list=useId(),box=useRef<HTMLDivElement>(null),known=useRef<string|null|undefined>(undefined),generation=useRef(0)
 const [query,setQuery]=useState(''),[options,setOptions]=useState<DiscoveryCity[]>([]),[open,setOpen]=useState(false),[active,setActive]=useState(-1),[loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const input=useRef<HTMLInputElement>(null)
 useEffect(()=>{input.current?.setCustomValidity(query.trim()&&!value?'Escolha uma cidade da lista ou apague o campo.':'')},[query,value])
 useEffect(()=>{
  if(value===known.current)return;known.current=value
  const sequence=++generation.current
  if(!value){setQuery('');return}
  void api<DiscoveryOptions>('/v1/catalog/discovery-options?cityId='+encodeURIComponent(value)).then(result=>{if(sequence!==generation.current)return;if(result.status!==200)throw Error('Não foi possível carregar a cidade.');const city=result.body.selectedCity;setQuery(city?city.name+' / '+city.state:'Cidade não encontrada')}).catch(()=>{if(sequence===generation.current)setError('Não foi possível carregar a cidade.')})
 },[value,attempt])
 useEffect(()=>{
  if(!open||query.trim().length<2){setOptions([]);setLoading(false);return}
  const sequence=++generation.current;setLoading(true);setError('')
  const timer=setTimeout(()=>{void api<DiscoveryOptions>('/v1/catalog/discovery-options?q='+encodeURIComponent(query.trim())).then(result=>{if(sequence!==generation.current)return;if(result.status!==200)throw Error();setOptions(result.body.cities);setActive(-1);setLoading(false)}).catch(()=>{if(sequence===generation.current){setError('Não foi possível buscar cidades.');setLoading(false)}})},200)
  return()=>{clearTimeout(timer);generation.current++}
 },[query,open,attempt])
 function choose(city:DiscoveryCity){known.current=city.id;onChange(city.id);setQuery(city.name+' / '+city.state);setOpen(false);setOptions([]);setError('')}
 return <div ref={box} className={styles.city} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <Input ref={input} id={id} role="combobox" autoComplete="off" maxLength={80} value={query} disabled={disabled} invalid={invalid} aria-describedby={describedBy} aria-expanded={open&&options.length>0} aria-controls={open&&options.length>0?list:undefined} aria-autocomplete="list" aria-activedescendant={open&&options[active]?list+'-'+active:undefined} placeholder="Digite a cidade e escolha na lista" onChange={event=>{known.current=null;onChange(null);setQuery(event.target.value);setOpen(true);setActive(-1);setOptions([])}} onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false)}
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActive(current=>event.key==='ArrowDown'?Math.min(current+1,options.length-1):Math.max(current-1,0))}
   if(event.key==='Enter'&&open){event.preventDefault();if(options[active])choose(options[active])}
  }}/>
  {open&&options.length>0?<ul className={styles.cityList} id={list} role="listbox" aria-label="Cidades encontradas">{options.map((city,index)=><li key={city.id} id={list+'-'+index} role="option" aria-selected={index===active} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(city)}>{city.name} / {city.state}</li>)}</ul>:null}
  {open&&loading?<span className={styles.feedback} role="status">Buscando cidades…</span>:null}
  {open&&!loading&&!error&&query.trim().length>=2&&options.length===0?<span className={styles.feedback} role="status">Nenhuma cidade encontrada. Tente o nome ou a UF.</span>:null}
  {error?<div className={styles.feedback} role="alert">{error}<Button type="button" onClick={()=>{if(value)known.current=undefined;setOpen(!value);setAttempt(value=>value+1)}}><ActionIcon name="refresh"/>Tentar de novo</Button></div>:null}
 </div>
}
