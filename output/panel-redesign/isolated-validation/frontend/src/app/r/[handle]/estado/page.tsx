import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ButtonLink } from '@/components/ui/button'
import { RedirectAgeGate } from '@/features/redirects/redirect-age-gate'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Acesso ao convite', robots: { index: false, follow: false } }
export default async function Page({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ idade?: string }> }) {
  const { handle } = await params, query = await searchParams
  if (!/^[a-f0-9-]{36}$/i.test(handle)) notFound()
  return <main className="auth-page"><h1 className="entry-title">{query.idade === '1' ? 'Confirme sua idade' : 'Convite indisponível'}</h1>{query.idade === '1' ? <RedirectAgeGate path={'/r/' + handle} /> : <><p className="auth-lead">O convite não está acessível agora. O responsável pode atualizar o destino mantendo este endereço.</p><ButtonLink href={'/r/' + handle}>Tentar novamente</ButtonLink><p className="auth-switch"><a href="/">Explorar catálogo</a></p></>}</main>
}
