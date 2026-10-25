import {privateMetadata} from '@/domain/crawler-policy'
import {DiagnosticsScreen} from '@/features/profile-diagnostics/diagnostics-screen'
export const metadata={...privateMetadata,title:'Melhorar minha página | Tem Link Aqui'}
export default function Page(){return <DiagnosticsScreen/>}
