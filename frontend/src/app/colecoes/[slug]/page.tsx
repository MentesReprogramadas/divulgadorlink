import type {Metadata} from 'next'
import {cache} from 'react'
import {cookies,headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {forward,tenantHost} from '@/lib/upstream'
import {ProfileAgeGate} from '@/features/profiles/profile-age-gate'
import {PublicCollectionView,type PublicCollection} from '@/features/favorites/public-collection'
export const dynamic='force-dynamic'
const load=cache(async(slug:string)=>{const h=await headers(),jar=await cookies();const result=await forward({method:'GET',path:'/api/v1/collections/'+encodeURIComponent(slug),host:tenantHost(h.get('host')??'localhost'),cookie:jar.get('age')?.value==='yes'?'age=yes':undefined,timeoutMs:10000});if([400,404].includes(result.status))return null;if(result.status!==200)throw new Error('Não foi possível carregar a coleção.');return JSON.parse(result.body.toString()) as PublicCollection|{restricted:true}})
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params,content=await load(slug);if(!content)notFound();return {title:content.restricted?'Conteúdo para maiores de 18 anos':content.title+' | Tem Link Aqui',description:content.restricted?undefined:content.description,robots:{index:false,follow:!content.restricted},alternates:{canonical:'https://'+tenantHost((await headers()).get('host')??'localhost')+'/colecoes/'+encodeURIComponent(slug)}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const content=await load((await params).slug);if(!content)notFound();return <main className="container" style={{paddingBlock:'var(--space-8)'}}>{content.restricted?<ProfileAgeGate/>:<PublicCollectionView content={content}/>}</main>}
