import { privateMetadata } from '@/domain/crawler-policy'
import { ProfilePreviewScreen } from '@/features/profiles/profile-preview-screen'
export const metadata = { ...privateMetadata, title: 'Prévia da sua página | Tem Link Aqui' }
export default function Page() { return <ProfilePreviewScreen /> }
