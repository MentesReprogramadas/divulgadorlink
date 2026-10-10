import type { Metadata } from 'next'
import { LegalArticle } from '@/components/domain/legal-article'
import { legalDocument } from '@/domain/legal'

export const metadata: Metadata = {
  title: 'Privacidade | Tem Link Aqui',
  robots: { index: true, follow: true },
}

export default function Page() {
  const { privacy } = legalDocument('comercial@contavera.com')
  return <LegalArticle title="Privacidade" document={privacy} other={{ href: '/termos', label: 'Termos' }} />
}
