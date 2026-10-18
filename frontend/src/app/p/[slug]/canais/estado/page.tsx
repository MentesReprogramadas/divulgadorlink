import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {ChannelAccessState} from '@/features/profile-channels/channel-access-state'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Acesso ao canal',robots:{index:false,follow:false}}
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{idade?:string}>}){
 const {slug}=await params,query=await searchParams
 if(!/^[a-z0-9-]{3,40}$/.test(slug))notFound()
 return <ChannelAccessState slug={slug} ageRequired={query.idade==='1'}/>
}
