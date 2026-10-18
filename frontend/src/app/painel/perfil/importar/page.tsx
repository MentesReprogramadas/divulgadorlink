import {privateMetadata} from '@/domain/crawler-policy'
import {ImportScreen} from '@/features/profile-import/import-screen'
export const metadata={...privateMetadata,title:'Importar links para minha página | Tem Link Aqui'}
export default function Page(){return <ImportScreen/>}
