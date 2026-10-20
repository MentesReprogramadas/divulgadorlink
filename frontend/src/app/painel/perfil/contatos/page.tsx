import {privateMetadata} from '@/domain/crawler-policy'
import {ContactScreen} from '@/features/contact-forms/contact-screen'
export const metadata={...privateMetadata,title:'Contatos da página | Tem Link Aqui'}
export default function Page(){return <ContactScreen/>}
