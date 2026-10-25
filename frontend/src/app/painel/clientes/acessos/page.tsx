import {privateMetadata} from '@/domain/crawler-policy'
import {AgencyAccessScreen} from '@/features/agency/agency-access-screen'
export const metadata={...privateMetadata,title:'Acessos por página | Tem Link Aqui'}
export default function Page(){return <AgencyAccessScreen/>}
