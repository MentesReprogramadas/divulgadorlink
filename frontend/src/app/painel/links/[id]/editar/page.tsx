'use client'

import { LinkEditor, useMyLinks } from '@/components/domain/panel-links'
import { useAreaSession } from '@/components/domain/panel'
import { useParams } from 'next/navigation'

export default function Page() {
  const session = useAreaSession()
  const params = useParams<{ id: string }>()
  const { links, error, ready } = useMyLinks()
  const link = links.find((row) => row.id === params.id)
  return (
    <>
      {!ready ? <p role="status" aria-label="Carregando">Carregando</p> : null}
      {error ? <p className="panel-note" role="alert">{error}</p> : null}
      {ready && !link ? <p className="panel-empty">Link não encontrado.</p> : null}
      {link ? (
        <>
          <h2 className="panel-section-title">{link.name}</h2>
          <LinkEditor link={link} banned={session?.status === 'BANNED'} />
        </>
      ) : null}
    </>
  )
}
