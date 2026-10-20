import {privateMetadata} from '@/domain/crawler-policy'
import {AssistantScreen} from '@/features/profile-assistant/assistant-screen'
export const metadata={...privateMetadata,title:'Assistente de criação | Tem Link Aqui'}
export default function Page(){return <AssistantScreen/>}
