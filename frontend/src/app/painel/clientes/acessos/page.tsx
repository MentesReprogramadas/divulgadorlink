import {privateMetadata} from '@/domain/crawler-policy'
import {AgencyAccessScreen} from '@/features/agency/agency-access-screen'
export const metadata={...privateMetadata,title:'Acessos por cliente | Tem Link Aqui'}
export default function Page(){return <AgencyAccessScreen/>}
