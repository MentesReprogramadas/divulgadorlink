import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { Source_Sans_3, Source_Serif_4, Outfit } from 'next/font/google'
import { accountLinks } from '@/domain/account-nav'
import { Consent } from '@/components/domain/consent'
import { SiteVisits } from '@/components/domain/site-visits'
import './globals.css'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
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
  const headerStore = await headers()
  const path = headerStore.get('x-pathname') ?? ''
  const jar = await cookies()
  const advertise = path === '/divulgar' || path.startsWith('/divulgar/') || jar.get('tla_shell')?.value === 'ad'
  const role = jar.get('catalogo_role')?.value
  const stored = jar.get('tla_consent')?.value
  const pending = stored !== 'marketing' && stored !== 'denied'
  const account = accountLinks(role)
  return (
    <html lang="pt-BR" className={`${sourceSans.variable} ${sourceSerif.variable} ${outfit.variable}`}>
      <body>
        <header className="site-header">
          <a className="site-mark" href={advertise ? '/divulgar' : '/'} aria-label={advertise ? 'Tem Link Aqui' : 'Home'}>
            <img src="/logo.svg" alt="" width={1292} height={235} />
          </a>
          <nav>
            {advertise ? null : <a href="/busca">Busca</a>}
            {account.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
        </header>
        {children}
        <Consent pending={pending} />
        <SiteVisits />
      </body>
    </html>
  )
}
