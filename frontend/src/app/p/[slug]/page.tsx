import {browserPageLocale} from '@/domain/public-page-locale'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { tenantHost } from '@/lib/upstream'
import { loadPublicProfile } from '@/features/profiles/server/load-profile'
import {ProfileExplorer} from '@/features/profiles/profile-explorer'
import {loadPublicProfileItems,ProfileSearchLoadError} from '@/features/profiles/server/load-profile-items'
import {profileSearchParams,readProfileSearch,emptyProfileQuery} from '@/features/profiles/profile-search-contract'
import {ProfileView} from '@/features/profiles/components/profile-view'
import {ErrorState} from '@/components/feedback/error-state'
import {ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import { ProfileAgeGate } from '@/features/profiles/profile-age-gate'
import styles from '@/features/profiles/components/profiles.module.css'
export const dynamic = 'force-dynamic'
export async function generateMetadata({ params,searchParams }: { params: Promise<{ slug: string }>;searchParams:Promise<Record<string,string|string[]|undefined>> }): Promise<Metadata> {
  const { slug } = await params,values=await searchParams,locale=typeof values.locale==='string'&&['pt-BR','en','es'].includes(values.locale)?values.locale as import('@/features/profiles/profile-contract').ProfileLocale:undefined,content = await loadPublicProfile(slug,locale)
  if (!content) notFound()
  const requestHeaders=await headers(),personal=requestHeaders.get('x-profile-hostname'),base=personal?'https://'+personal+'/':'https://'+tenantHost(requestHeaders.get('host')??'localhost')+'/p/'+encodeURIComponent(slug)
  return { title: content.restricted ? 'Conteúdo para maiores de 18 anos' : content.name + ' | Tem Link Aqui', description: content.restricted ? undefined : content.bio, robots: { index: false, follow: !content.restricted }, alternates: { canonical:base+(content.restricted||!content.locale||content.locale===content.fallbackLocale?'':'?locale='+content.locale),...(!content.restricted&&content.availableLocales?{languages:Object.fromEntries(content.availableLocales.map(language=>[language,base+(language===content.fallbackLocale?'':'?locale='+language)]))}:{}) } }
}
async function invalidSearch(slug:string,message:string){
  const original=await loadPublicProfile(slug);if(!original)notFound()
  return <main className={styles.personalPage}>{original.restricted?<ProfileAgeGate/>:<ProfileView content={{...original,items:[],categories:[],contentBlocks:[],primaryItemId:null}} notice={<ErrorState message={message}/>} empty={<ButtonLink href={'/p/'+encodeURIComponent(slug)}><ActionIcon name="resetFilters"/>Limpar busca</ButtonLink>}/>}</main>
}
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {slug}=await params,values=await searchParams,paramsToRead=new URLSearchParams()
  for(const key of ['q','categoryId','cursor','locale']){const value=values[key];if(Array.isArray(value))value.forEach(item=>paramsToRead.append(key,item));else if(value!==undefined)paramsToRead.set(key,value)}
  let query=emptyProfileQuery();try{query=readProfileSearch(paramsToRead)}catch(reason){return invalidSearch(slug,reason instanceof Error?reason.message:'Confira os filtros.')}
  if(!query.locale){const locale=browserPageLocale((await headers()).get('accept-language'));if(locale)query={...query,locale}}
  let content,notice=''
  try{content=await loadPublicProfileItems(slug,profileSearchParams(query).toString())}catch(reason){
    if(reason instanceof ProfileSearchLoadError&&reason.status===409&&query.cursor){query={...query,cursor:null};content=await loadPublicProfileItems(slug,profileSearchParams(query).toString());notice='Os resultados mudaram. Mostrando a primeira página.'}
    else if(reason instanceof ProfileSearchLoadError&&[400,422].includes(reason.status))return invalidSearch(slug,reason.message)
    else throw reason
  }
  if(!content)notFound()
  return <main className={styles.personalPage}>{content.restricted?<ProfileAgeGate/>:<ProfileExplorer key={slug+'-'+content.publishedRevisionId+'-'+profileSearchParams(query).toString()} initial={content} source={{kind:'public',slug}} initialNotice={notice}/>}</main>
}
