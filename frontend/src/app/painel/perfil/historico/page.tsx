import { privateMetadata } from '@/domain/crawler-policy'
import { ProfileHistoryScreen } from '@/features/profiles/profile-history-screen'
export const metadata = { ...privateMetadata, title: 'Histórico da minha página | Tem Link Aqui' }
export default function Page() { return <ProfileHistoryScreen /> }
