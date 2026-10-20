import {privateMetadata} from '@/domain/crawler-policy'
import {NicheFollowsScreen} from '@/features/niche-follows/niche-follows-screen'
export const metadata={...privateMetadata,title:'Categorias seguidas | Tem Link Aqui'}
export default function Page(){return <NicheFollowsScreen/>}
