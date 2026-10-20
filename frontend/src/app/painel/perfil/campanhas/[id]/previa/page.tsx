import {privateMetadata} from '@/domain/crawler-policy'
import {CampaignPreview} from '@/features/profile-campaigns/campaign-preview'
export const metadata={...privateMetadata,title:'Prévia da campanha | Tem Link Aqui'}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CampaignPreview key={id} id={id}/>}
