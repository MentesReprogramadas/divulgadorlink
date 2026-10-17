import type { Metadata } from 'next'
import { LegalArticle } from '@/components/domain/legal-article'
import { legalDocument } from '@/domain/legal'

export const metadata: Metadata = {
  title: 'Termos | Tem Link Aqui',
  robots: { index: true, follow: true },
}

export default function Page() {
  const { terms } = legalDocument('comercial@contavera.com')
  return <LegalArticle title="Termos" document={terms} other={{ href: '/privacidade', label: 'Privacidade' }} />
}
