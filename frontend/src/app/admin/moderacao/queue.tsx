'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { api } from '@/lib/api'

type CaseRow = {
  id: string
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
}

let caseCache: CaseRow[] | null = null

export function ModerationQueue() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
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

  return (
    <>
      {failed ? <ErrorState onRetry={load} /> : null}
      {ready && !failed && cases.length === 0 ? <p>Nenhum caso aberto</p> : null}
      <div className="moderation-grid">
        {cases.map((row) => {
          const owner = [row.ownerName, row.ownerEmail].filter(Boolean).join(' · ')
          const place = [row.network, row.niche].filter(Boolean).join(' · ')
          return (
            <article key={row.id} className="link-card moderation-card">
              <p className="moderation-kicker">{SOURCE[row.source] ?? row.source} · {STATUS[row.status] ?? row.status}</p>
              <h2>{row.name}</h2>
              {row.description ? <p>{row.description}</p> : null}
              {row.url ? <p><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></p> : null}
              {place ? <p className="panel-meta">{place}</p> : null}
              {owner ? <p className="panel-meta">{owner}</p> : null}
              {row.appealText ? <p><strong>Contestação.</strong> {row.appealText}</p> : null}
              {row.previousName ? <p className="panel-meta">Nome anterior: {row.previousName}</p> : null}
              {row.previousDescription ? <p className="panel-meta">Descrição anterior: {row.previousDescription}</p> : null}
              <div className="moderation-actions">
                <Button type="button" className="button-approve" disabled={pending === row.id} onClick={() => void decide(row.id, 'APPROVE')}>Aprovar</Button>
                <Button type="button" className="button-reject" disabled={pending === row.id} onClick={() => void decide(row.id, 'REJECT')}>Rejeitar</Button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
