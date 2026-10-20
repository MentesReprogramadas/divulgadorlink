import {headers} from 'next/headers'
import {personalHostTarget,personalHostOrigin} from '@/features/profile-hosts/host-routing'
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
  const requestHeaders=await headers(),hostHeader=requestHeaders.get('host')??'',personal=personalHostTarget(hostHeader),personalHost=Boolean(personal)
  const personalOrigin=personal?personalHostOrigin(personal.tenantHost,hostHeader.split(':')[1]??''):undefined
  const jar = await cookies()
  const role = jar.get('catalogo_role')?.value
  const support = jar.has('supportSession')
  const stored = jar.get('tla_consent')?.value
  const pending = stored !== 'marketing' && stored !== 'denied'
  return (
    <html lang="pt-BR" className={`${sourceSans.variable} ${outfit.variable}`}>
      <body data-personal-origin={personalOrigin} data-personal-host={personalHost?'true':undefined} data-support={!personalHost&&support?'true':undefined}>
        <SiteShell personalHost={personalHost} role={personalHost?undefined:role} support={!personalHost&&support}>{children}</SiteShell>
        <Consent pending={pending} />
        {personalHost?null:<SiteVisits />}
      </body>
    </html>
  )
}
