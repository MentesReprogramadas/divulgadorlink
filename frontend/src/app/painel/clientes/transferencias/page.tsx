import {privateMetadata} from '@/domain/crawler-policy'
import {AgencyTransfersScreen} from '@/features/agency/agency-transfers-screen'
export const metadata={...privateMetadata,title:'Transferir página | Tem Link Aqui'}
export default function Page(){return <AgencyTransfersScreen/>}
