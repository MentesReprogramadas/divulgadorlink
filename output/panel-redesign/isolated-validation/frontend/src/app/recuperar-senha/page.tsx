import type { Metadata } from 'next'
import { ResetForm } from './reset-form'
import { privateMetadata } from '@/domain/crawler-policy'

export const metadata: Metadata = privateMetadata

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  return (
    <main className="auth-page">
      <h1 className="entry-title">Nova senha</h1>
      <p className="auth-lead">Escolha uma senha com pelo menos 8 caracteres.</p>
      <ResetForm token={params.token ?? ''} />
    </main>
  )
}
