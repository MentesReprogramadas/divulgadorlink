'use client'

import { FormSkeleton } from '@/components/layout/workspace-skeleton'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { ButtonLink } from '@/components/ui/button'

import { LinkEditor, useMyLinks } from '@/components/domain/panel-links'
import { useAreaSession } from '@/components/domain/panel'
import { useParams } from 'next/navigation'

export default function Page() {
  const session = useAreaSession()
  const params = useParams<{ id: string }>()
  const { links, error, ready, reload } = useMyLinks()
  const link = links.find((row) => row.id === params.id)
  return (
    <>
      {!ready ? <FormSkeleton fields={2} multiline /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {ready && !error && !link ? <EmptyState action={<ButtonLink href="/painel/links" variant="secondary">Voltar aos seus links</ButtonLink>}>Link não encontrado.</EmptyState> : null}
      {!error && link ? (
        <>
          <h2 className="panel-section-title">{link.name}</h2>
          <LinkEditor link={link} banned={session?.status === 'BANNED'} />
        </>
      ) : null}
    </>
  )
}
