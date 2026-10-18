import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Source_Sans_3, Outfit } from 'next/font/google'
import { SiteShell } from '@/components/layout/site-shell'
import { Consent } from '@/components/domain/consent'
import { SiteVisits } from '@/components/domain/site-visits'
import './globals.css'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
})

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'Tem Link Aqui',
  description: 'Links, comunidades e serviços organizados por tema e rede.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const role = jar.get('catalogo_role')?.value
  const support = jar.has('supportSession')
  const stored = jar.get('tla_consent')?.value
  const pending = stored !== 'marketing' && stored !== 'denied'
  return (
    <html lang="pt-BR" className={`${sourceSans.variable} ${outfit.variable}`}>
      <body data-support={support ? 'true' : undefined}>
        <SiteShell role={role} support={support}>{children}</SiteShell>
        <Consent pending={pending} />
        <SiteVisits />
      </body>
    </html>
  )
}
