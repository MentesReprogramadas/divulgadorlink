import {privateMetadata} from '@/domain/crawler-policy'
import {AgencyClientsScreen} from '@/features/agency/agency-clients-screen'
export const metadata={...privateMetadata,title:'Páginas que gerencio | Tem Link Aqui'}
export default function Page(){return <AgencyClientsScreen/>}
