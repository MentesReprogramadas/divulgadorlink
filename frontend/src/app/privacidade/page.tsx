import type { Metadata } from 'next'
import { legalPages } from '@/domain/legal'

export const metadata: Metadata = {
  title: 'Privacidade | Tem Link Aqui',
  robots: { index: true, follow: true },
}

export default function Page() {
  const { privacy } = legalPages('comercial@contavera.com')
  return (
    <main className="auth-page">
      <h1 className="entry-title">Privacidade</h1>
      {privacy.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </main>
  )
}
