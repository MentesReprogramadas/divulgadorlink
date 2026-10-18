import {privateMetadata} from '@/domain/crawler-policy'
import {ProfileChecklistScreen} from '@/features/profile-checklist/checklist-screen'
export const metadata={...privateMetadata,title:'Checklist da minha página | Tem Link Aqui'}
export default function Page(){return <ProfileChecklistScreen/>}
