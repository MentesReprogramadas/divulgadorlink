'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type Retention = { before: string; pending: number }

function showDay(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

export function RetentionPanel() {
  const [view, setView] = useState<Retention | null>(null)
  const [notice, setNotice] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setFailed(false)
    const response = await api<Retention & { message?: string }>('/v1/admin/retention')
    if (response.status !== 200) {
      setFailed(true)
      return
    }
    setView(response.body)
  }

  useEffect(() => {
    void load()
  }, [])

  async function purge() {
    setBusy(true)
    setNotice('')
    const response = await api<{ queued?: boolean; message?: string }>('/v1/admin/retention', {
      method: 'POST',
      body: '{}',
    })
    setBusy(false)
    if (response.status !== 202 || response.body.queued !== true) {
      setNotice(response.body.message ?? 'Não foi possível enfileirar.')
      return
    }
    setNotice('Pedido enviado ao worker. A contagem cai quando ele termina. Pedido e pagamento não entram.')
    await load()
  }

  if (failed) return <p>Não foi possível ler a retenção.</p>
  if (!view) return <p>Carregando…</p>

  return (
    <section aria-label="Retenção de analytics">
      <h2>Retenção</h2>
      <p>
        Impressão e clique anteriores a {showDay(view.before)} saem no processo diário do worker.
        Este botão só enfileira o mesmo corte, no máximo 100 mil eventos. Pedido e pagamento não entram.
      </p>
      <p className="metric">
        <span className="metric-value">{view.pending.toLocaleString('pt-BR')}</span>
        <span className="metric-label">{view.pending === 0 ? 'nada além do prazo' : 'além do prazo'}</span>
      </p>
      {notice ? <p role="status">{notice}</p> : null}
      <Button type="button" variant="danger" disabled={busy || view.pending === 0} onClick={() => void purge()}>
        Pedir expurgo
      </Button>
    </section>
  )
}
