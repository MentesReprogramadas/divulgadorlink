import {privateMetadata} from '@/domain/crawler-policy'
import {CampaignScreen} from '@/features/profile-campaigns/campaign-screen'
export const metadata={...privateMetadata,title:'Campanhas da minha página | Tem Link Aqui'}
export default function Page(){return <CampaignScreen/>}
