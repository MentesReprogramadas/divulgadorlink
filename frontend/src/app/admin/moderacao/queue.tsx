'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { api } from '@/lib/api'

type CaseRow = { id: string; name: string; status: string }

export function ModerationQueue() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  function load() {
    setFailed(false)
    void api<{ cases?: CaseRow[]; message?: string }>('/v1/admin/moderation').then((result) => {
      if (result.status !== 200) {
        setFailed(true)
        setCases([])
      } else {
        setCases(result.body.cases ?? [])
      }
      setReady(true)
    })
  }

  useEffect(() => { load() }, [])

  async function decide(id: string, decision: 'APPROVE' | 'REJECT') {
    const result = await api(`/v1/admin/moderation/${id}`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    })
    if (result.status !== 200) {
      setFailed(true)
      return
    }
    setCases((current) => current.filter((item) => item.id !== id))
  }

  return (
    <main>
      <h1>Moderação</h1>
      {failed ? <ErrorState onRetry={load} /> : null}
      {ready && !failed && cases.length === 0 ? <p>Nenhum caso aberto</p> : null}
      {cases.map((row) => (
        <article key={row.id}>
          <p>{row.name}</p>
          <Button type="button" onClick={() => void decide(row.id, 'APPROVE')}>Aprovar</Button>
          <Button type="button" onClick={() => void decide(row.id, 'REJECT')}>Rejeitar</Button>
        </article>
      ))}
    </main>
  )
}
