import {privateMetadata} from '@/domain/crawler-policy'
import {InteractionScreen} from '@/features/profile-interaction/interaction-screen'
export const metadata={...privateMetadata,title:'Métricas da campanha | Tem Link Aqui'}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <InteractionScreen key={id} campaignId={id}/>}
