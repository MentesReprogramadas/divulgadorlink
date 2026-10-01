'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { readSession } from '@/domain/session'
import { api } from '@/lib/api'

type Refund = {
  orderId: string
  userId: string | null
  amountCents: number
  refundIds: string[]
  attempts: number
  errors: string[]
  createdAt: string
  message: string | null
  status: string
}

export default function Page() {
  const [rows, setRows] = useState<Refund[]>([])
  useEffect(() => {
    if (readSession()?.role !== 'ADMIN') return
    void api<{ refunds: Refund[] }>('/v1/admin/refunds').then((result) => setRows(result.body.refunds ?? []))
  }, [])
  return (
    <main>
      <h1>Estornos</h1>
      {rows.length === 0 ? <p>Nenhum estorno</p> : null}
      {rows.map((row) => (
        <article key={row.orderId} className="card">
          <p>Pedido {row.orderId}</p>
          <p>Usuário {row.userId}</p>
          <p>{formatCents(row.amountCents)}</p>
          <p>Ids {row.refundIds.join(', ')}</p>
          <p>Tentativas {row.attempts}</p>
          <p>{row.errors.join(' ')}</p>
          <p>{row.message}</p>
          <p>{row.createdAt}</p>
          {row.status === 'REFUND_FAILED' ? (
            <Button type="button" onClick={() => void api(`/v1/admin/refunds/${row.orderId}/resolved`, { method: 'POST', body: '{}' })}>
              Marcar como estornado
            </Button>
          ) : null}
        </article>
      ))}
    </main>
  )
}
