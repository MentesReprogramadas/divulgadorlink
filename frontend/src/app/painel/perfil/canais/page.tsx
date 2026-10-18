import type {Metadata} from 'next'
import {ChannelsScreen} from '@/features/profile-channels/channels-screen'
export const metadata:Metadata={title:'Canais de acesso',robots:{index:false,follow:false}}
export default function Page(){return <ChannelsScreen/>}
