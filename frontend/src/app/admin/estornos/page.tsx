'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { formatWhen } from '@/domain/format'
import { readSession } from '@/domain/session'
import { api } from '@/lib/api'

type Refund = {
  orderId: string
  userId: string | null
  userName: string
  userEmail: string
  linkId: string
  linkName: string
  productCode: string
  durationDays: number
  method: string
  amountCents: number
  refundIds: string[]
  attempts: number
  errors: string[]
  createdAt: string
  message: string | null
  status: string
}

const PRODUCT: Record<string, string> = {
  SEARCH: 'Busca',
  NICHE: 'Nicho',
  HOME: 'Home',
  SEARCH_NICHE: 'Busca e nicho',
  SEARCH_NICHE_HOME: 'Completo',
}

let refundCache: Refund[] | null = null

export default function Page() {
  const [rows, setRows] = useState<Refund[] | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (refundCache) setRows(refundCache)
  }, [])

  useEffect(() => {
    if (readSession()?.role !== 'ADMIN') return
    void api<{ refunds: Refund[] }>('/v1/admin/refunds').then((result) => {
      refundCache = result.body.refunds ?? []
      setRows(refundCache)
    })
  }, [])

  async function resolve(orderId: string) {
    if (pending) return
    setPending(orderId)
    const result = await api(`/v1/admin/refunds/${orderId}/resolved`, { method: 'POST', body: '{}' })
    setPending(null)
    if (result.status === 200) {
      setRows((current) => {
        const next = (current ?? []).filter((row) => row.orderId !== orderId)
        refundCache = next
        return next
      })
    }
  }

  return (
    <>
      {rows && rows.length === 0 ? <p>Nenhum estorno</p> : null}
      <div className="refund-grid">
        {(rows ?? []).map((row) => {
          const user = [row.userName, row.userEmail].filter(Boolean).join(' · ') || row.userId || 'Usuário removido'
          const plan = `${PRODUCT[row.productCode] ?? row.productCode} · ${row.durationDays} dias · ${row.method === 'CARD' ? 'Cartão' : 'Pix'}`
          return (
            <article key={row.orderId} className="order-card">
              <p className="moderation-kicker">{row.status === 'REFUND_FAILED' ? 'Estorno falhou' : row.status}</p>
              <h2>{row.linkName || 'Link removido'}</h2>
              <p className="panel-amount">{formatCents(row.amountCents)}</p>
              <p>{user}</p>
              <p className="panel-meta">{plan}</p>
              <p className="panel-meta">{row.attempts} {row.attempts === 1 ? 'tentativa' : 'tentativas'}</p>
              {row.refundIds.length > 0 ? <p className="panel-meta">IDs {row.refundIds.join(', ')}</p> : null}
              {row.errors.length > 0 ? <p>{row.errors.join(' ')}</p> : null}
              {row.message ? <p>{row.message}</p> : null}
              {formatWhen(row.createdAt) ? <p className="panel-meta">{formatWhen(row.createdAt)}</p> : null}
              {row.status === 'REFUND_FAILED' ? (
                <Button type="button" disabled={pending === row.orderId} onClick={() => void resolve(row.orderId)}>
                  Marcar como estornado
                </Button>
              ) : null}
            </article>
          )
        })}
      </div>
    </>
  )
}
