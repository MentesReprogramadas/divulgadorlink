export type DiscoveryValues={cityId:string|null;languageTag:string|null;modality:'ONLINE'|'PRESENTIAL'|null}
export type DiscoveryCity={id:string;name:string;state:string}
export type DiscoveryOptions={exactCity?:DiscoveryCity|null;cities:DiscoveryCity[];selectedCity:DiscoveryCity|null;languages:Array<{code:string;name:string}>;modalities:Array<{code:string;name:string}>}
export const emptyDiscovery=():DiscoveryValues=>({cityId:null,languageTag:null,modality:null})
export function discoveryParams(values:DiscoveryValues){const params=new URLSearchParams();for(const key of ['cityId','languageTag','modality'] as const)if(values[key])params.set(key,values[key]);return params}
export function readDiscovery(params:URLSearchParams):DiscoveryValues{
 for(const key of ['cityId','languageTag','modality'])if(params.getAll(key).length>1)throw Error('Use apenas um valor por filtro.')
 const cityId=params.get('cityId')?.trim()||null,rawLanguage=params.get('languageTag')?.trim(),modality=params.get('modality')?.trim().toUpperCase()||null
 let languageTag:string|null=null
 if(rawLanguage){try{const tag=rawLanguage.replaceAll('_','-'),canonical=new Intl.Locale(tag).language,primary=tag.split('-')[0].toLowerCase();languageTag=canonical.length!==2&&primary.length===2?primary:canonical}catch{throw Error('Escolha um idioma válido.')}}
 if(cityId&&!/^\d{7}$/.test(cityId)||languageTag&&!/^[a-z]{2}$/.test(languageTag)||modality&&!['ONLINE','PRESENTIAL'].includes(modality))throw Error('Confira a cidade, o idioma e o formato.')
 return {cityId,languageTag,modality:modality as DiscoveryValues['modality']}
}
export function discoveryQueryRecord(values:Record<string,string|string[]|undefined>){const result=new URLSearchParams();for(const key of ['cityId','languageTag','modality']){const value=values[key];if(Array.isArray(value))value.forEach(item=>result.append(key,item));else if(value)result.set(key,value)}return result}
export function discoveryHref(base:string,values:DiscoveryValues){const url=new URL(base,'https://local.invalid');const params=discoveryParams(values);params.forEach((value,key)=>url.searchParams.set(key,value));return url.pathname+url.search}
