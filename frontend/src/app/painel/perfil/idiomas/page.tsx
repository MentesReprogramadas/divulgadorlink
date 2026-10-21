import {privateMetadata} from '@/domain/crawler-policy'
import {ProfileLanguagesScreen} from '@/features/profiles/profile-languages-screen'
export const metadata={...privateMetadata,title:'Idiomas da página | Tem Link Aqui'}
export default function Page(){return <ProfileLanguagesScreen/>}
