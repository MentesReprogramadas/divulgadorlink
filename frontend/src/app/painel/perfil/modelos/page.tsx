import {privateMetadata} from '@/domain/crawler-policy'
import {TemplatesScreen} from '@/features/profile-templates/templates-screen'
export const metadata={...privateMetadata,title:'Modelos da minha página | Tem Link Aqui'}
export default function Page(){return <TemplatesScreen/>}
