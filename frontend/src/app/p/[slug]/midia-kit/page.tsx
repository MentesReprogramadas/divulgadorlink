import type {Metadata} from 'next'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {tenantHost} from '@/lib/upstream'
import {loadMediaKit} from '@/features/media-kit/server/load-media-kit'
import {MediaKitView} from '@/features/media-kit/media-kit-view'
import styles from '@/features/profiles/components/profiles.module.css'
export const dynamic='force-dynamic'
type Props={params:Promise<{slug:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params,kit=await loadMediaKit(slug);if(!kit)notFound();return {title:kit.restricted?'Conteúdo para maiores de 18 anos':kit.presentation.name+' — Apresentação para parceiros',description:kit.restricted?undefined:kit.presentation.bio,robots:{index:false,follow:!kit.restricted},alternates:{canonical:'https://'+tenantHost((await headers()).get('host')??'localhost')+'/p/'+encodeURIComponent(slug)+'/midia-kit'}}}
export default async function Page({params}:Props){const kit=await loadMediaKit((await params).slug);if(!kit)notFound();return <main className={styles.personalPage}><MediaKitView kit={kit}/></main>}

