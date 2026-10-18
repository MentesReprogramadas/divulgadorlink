import {z} from 'zod'
import {CITY_REFERENCE,LANGUAGE_CODES} from './discovery-reference'
export type DiscoveryMetadata={cityId:string|null;languageTag:string|null;modality:'ONLINE'|'PRESENTIAL'|null}
const cities=new Map(CITY_REFERENCE.map(([id,name,state])=>[id,{id,name,state}]))
const languageCodes=new Set(LANGUAGE_CODES)
const nullable=(value:unknown)=>typeof value==='string'?(value.trim()||null):value===undefined?null:value
function language(value:unknown){
 const normalized=nullable(value);if(typeof normalized!=='string')return normalized
 try{const tag=normalized.replaceAll('_','-'),canonical=new Intl.Locale(tag).language,primary=tag.split('-')[0].toLowerCase();return canonical.length!==2&&languageCodes.has(primary)?primary:canonical}catch{return normalized}
}
export const discoveryFields={
 cityId:z.preprocess(nullable,z.string().refine(value=>cities.has(value),'Escolha uma cidade da lista.').nullable()),
 languageTag:z.preprocess(language,z.string().refine(value=>languageCodes.has(value),'Escolha um idioma válido.').nullable()),
 modality:z.preprocess(value=>{const normalized=nullable(value);return typeof normalized==='string'?normalized.toUpperCase():normalized},z.enum(['ONLINE','PRESENTIAL']).nullable()),
}
const schema=z.object(discoveryFields)
export function parseDiscovery(input:unknown):DiscoveryMetadata{return schema.parse(input)}
export function matchesDiscovery(row:Partial<DiscoveryMetadata>,filters:DiscoveryMetadata):boolean{
 return (!filters.cityId||row.cityId===filters.cityId)&&(!filters.languageTag||row.languageTag===filters.languageTag)&&(!filters.modality||row.modality===filters.modality)
}
export function cityById(id:string|null|undefined){return id?cities.get(id)??null:null}
const normalize=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim()
export function findCities(query:string){
 const words=normalize(query).split(' ').filter(Boolean);if(normalize(query).length<2)return []
 return [...cities.values()].filter(city=>words.every(word=>normalize(city.name+' '+city.state).includes(word))).slice(0,20)
}
const labels=new Intl.DisplayNames(['pt-BR'],{type:'language'})
export const discoveryLanguages=LANGUAGE_CODES.map(code=>({code,name:labels.of(code)??code})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
export function discoverySql(first:number){return `AND ($${first}::text IS NULL OR l."cityId" = $${first}) AND ($${first+1}::text IS NULL OR l."languageTag" = $${first+1}) AND ($${first+2}::text IS NULL OR l."modality" = $${first+2})`}
