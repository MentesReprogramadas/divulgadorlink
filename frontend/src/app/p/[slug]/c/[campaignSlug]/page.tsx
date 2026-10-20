import profileStyles from '@/features/profiles/components/profiles.module.css'
import type {Metadata} from 'next'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {tenantHost} from '@/lib/upstream'
import {loadCampaign} from '@/features/profile-campaigns/server/load-campaign'
import {CampaignView} from '@/features/profile-campaigns/campaign-view'
export const dynamic='force-dynamic'
type Props={params:Promise<{slug:string;campaignSlug:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug,campaignSlug}=await params,content=await loadCampaign(slug,campaignSlug);if(!content)notFound();return {title:content.restricted?'Conteúdo para maiores de 18 anos':content.name+' | Tem Link Aqui',description:content.restricted?undefined:content.bio,robots:{index:false,follow:!content.restricted},alternates:{canonical:'https://'+tenantHost((await headers()).get('host')??'localhost')+'/p/'+encodeURIComponent(slug)+'/c/'+encodeURIComponent(campaignSlug)}}}
export default async function Page({params}:Props){const {slug,campaignSlug}=await params,content=await loadCampaign(slug,campaignSlug);if(!content)notFound();return <main className={profileStyles.personalPage}><CampaignView key={slug+'-'+campaignSlug+'-'+(content.restricted?'restricted':content.publishedRevisionId)} initial={content} slug={slug} campaignSlug={campaignSlug}/></main>}
