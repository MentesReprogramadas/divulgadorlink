import type { Metadata } from 'next'
import { legalPages } from '@/domain/legal'

export const metadata: Metadata = {
  title: 'Termos | Tem Link Aqui',
  robots: { index: true, follow: true },
}

export default function Page() {
  const { terms } = legalPages('comercial@contavera.com')
  return (
    <main className="auth-page">
      <h1 className="entry-title">Termos</h1>
      {terms.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </main>
  )
}
