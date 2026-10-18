import {privateMetadata} from '@/domain/crawler-policy'
import {InteractionScreen} from '@/features/profile-interaction/interaction-screen'
export const metadata={...privateMetadata,title:'Métricas da minha página | Tem Link Aqui'}
export default function Page(){return <InteractionScreen/>}
