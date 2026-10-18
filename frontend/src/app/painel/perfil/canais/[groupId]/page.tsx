import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {ChannelsScreen} from '@/features/profile-channels/channels-screen'
export const metadata:Metadata={title:'Grupo de canais',robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{groupId:string}>}){
 const {groupId}=await params
 if(groupId!=='novo'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(groupId))notFound()
 return <ChannelsScreen entry={groupId==='novo'?{kind:'NEW'}:{kind:'EDIT',id:groupId}}/>
}
