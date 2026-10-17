'use client'

import { ListSkeleton } from '@/components/layout/workspace-skeleton'
import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useLayoutEffect, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { api } from '@/lib/api'
import { Field, Input, Select } from '@/components/ui/input'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { EmptyState } from '@/components/feedback/empty-state'
import queueStyles from './queue.module.css'

type CaseRow = {
  id: string
  linkId: string
  name: string
  description: string
  url: string
  status: string
  niche: string
  network: string
  ownerName: string
  ownerEmail: string
  source: string
  appealText: string | null
  previousName: string | null
  previousDescription: string | null
}

const STATUS: Record<string, string> = {
  PENDING_MODERATION: 'Aguardando',
  PRE_REJECTED: 'Pré-rejeitado',
  PUBLISHED: 'Publicado',
  DRAFT: 'Rascunho',
  UNAVAILABLE: 'Indisponível',
}

const SOURCE: Record<string, string> = {
  AI: 'Revisão automática',
  BLOCKLIST: 'Lista de bloqueio',
  PRE_REFUSAL: 'Pré-recusa',
  APPEAL: 'Contestação',
  SUBMISSION: 'Envio',
  TEXT: 'Alteração de texto',
}

let caseCache: CaseRow[] | null = null

export function ModerationQueue({ linkId }: { linkId?: string }) {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('ALL')
  const [pending, setPending] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!caseCache) return
    setCases(caseCache)
    setReady(true)
  }, [])

  function load() {
    setFailed(false)
    void api<{ cases?: CaseRow[]; message?: string }>('/v1/admin/moderation').then((result) => {
      if (result.status !== 200) {
        setFailed(true)
        setCases([])
      } else {
        caseCache = result.body.cases ?? []
        setCases(caseCache)
      }
      setReady(true)
    })
  }

  useEffect(() => { load() }, [])

  async function decide(id: string, decision: 'APPROVE' | 'REJECT') {
    if (pending) return
    setPending(id)
    const result = await api(`/v1/admin/moderation/${id}`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    })
    setPending(null)
    if (result.status !== 200) {
      setFailed(true)
      return
    }
    setCases((current) => {
      const next = current.filter((item) => item.id !== id)
      caseCache = next
      return next
    })
  }

  const visibleCases = (linkId ? cases.filter(row => row.linkId === linkId) : cases).filter(row =>
    (source === 'ALL' || row.source === source) && `${row.name} ${row.url} ${row.ownerName} ${row.ownerEmail} ${row.niche} ${row.network}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim()))

  return (
    <>
      <WorkspaceActions>{linkId ? <ButtonLink variant="secondary" href="/admin/moderacao"><ActionIcon name="reviews" />Ver toda a fila</ButtonLink> : null}<Button variant="secondary" onClick={() => { setQuery(''); setSource('ALL') }}><ActionIcon name="resetFilters" />Limpar filtros</Button></WorkspaceActions>
      <WorkspaceFilters label="Filtrar fila de moderação">
        <Field label="Buscar na fila"><Input type="search" value={query} placeholder="Link, responsável ou categoria" onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Origem da revisão"><Select value={source} onChange={event => setSource(event.target.value)}><option value="ALL">Todas as origens</option>{Array.from(new Set(cases.map(row => row.source))).map(value => <option key={value} value={value}>{SOURCE[value] ?? value}</option>)}</Select></Field>
      </WorkspaceFilters>
      {!ready && !failed ? <ListSkeleton kind="queue" filters={0} actions={false} /> : null}
      {failed ? <ErrorState onRetry={load} /> : null}
      {ready && !failed && visibleCases.length === 0 ? <EmptyState>{query || source !== 'ALL' ? 'Nenhum caso corresponde aos filtros.' : 'Nada por aqui ainda.'}</EmptyState> : null}
      <div className="moderation-grid">
        {visibleCases.map((row) => {
          const owner = [row.ownerName, row.ownerEmail].filter(Boolean).join(' · ')
          const place = [row.network, row.niche].filter(Boolean).join(' · ')
          return (
            <article key={row.id} className={`link-card ${queueStyles.card}`}>
              <p className="moderation-kicker">{SOURCE[row.source] ?? row.source} · {STATUS[row.status] ?? row.status}</p>
              <h2>{row.name}</h2>
              <div className={queueStyles.content}>
              {row.description ? <p>{row.description}</p> : null}
              {row.url ? <p><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></p> : null}
              </div>
              {place ? <p className="panel-meta"><strong>Rede e categoria:</strong> {place}</p> : null}
              {owner ? <p className="panel-meta"><strong>Responsável:</strong> {owner}</p> : null}
              {row.appealText ? <p><strong>Contestação.</strong> {row.appealText}</p> : null}
              {row.previousName ? <p className="panel-meta">Nome anterior: {row.previousName}</p> : null}
              {row.previousDescription ? <p className="panel-meta">Descrição anterior: {row.previousDescription}</p> : null}
              <div className={queueStyles.actions}>
                <Button type="button" className="button-approve" disabled={pending === row.id} onClick={() => void decide(row.id, 'APPROVE')}><ActionIcon name="check" />Aprovar</Button>
                <Button type="button" className="button-reject" disabled={pending === row.id} onClick={() => void decide(row.id, 'REJECT')}><ActionIcon name="reject" />Rejeitar</Button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
