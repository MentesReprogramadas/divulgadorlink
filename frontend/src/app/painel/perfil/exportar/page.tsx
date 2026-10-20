import {privateMetadata} from '@/domain/crawler-policy'
import {ProfileExportScreen} from '@/features/profiles/profile-export-screen'
export const metadata={...privateMetadata,title:'Importar e exportar minha página | Tem Link Aqui'}
export default function Page(){return <ProfileExportScreen/>}
