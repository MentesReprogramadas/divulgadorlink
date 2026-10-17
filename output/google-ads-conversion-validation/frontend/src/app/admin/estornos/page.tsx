'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { EmptyState } from '@/components/feedback/empty-state'
import { Loading } from '@/components/feedback/loading'
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
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const result = await api<{ refunds?: Refund[] }>('/v1/admin/refunds')
      if (result.status !== 200) {
        setError('Não foi possível carregar os estornos.')
        return
      }
      refundCache = result.body.refunds ?? []
      setRows(refundCache)
    } catch {
      setError('Não foi possível conectar para carregar os estornos.')
    }
  }

  useLayoutEffect(() => {
    if (refundCache) setRows(refundCache)
  }, [])

  useEffect(() => {
    if (readSession()?.role !== 'ADMIN') return
    void load()
  }, [])

  async function resolve(orderId: string) {
    if (pending) return
    setPending(orderId)
    setError('')
    try {
      const result = await api(`/v1/admin/refunds/${orderId}/resolved`, { method: 'POST', body: '{}' })
      setPending(null)
      if (result.status === 200) {
        setRows((current) => {
          const next = (current ?? []).filter((row) => row.orderId !== orderId)
          refundCache = next
          return next
        })
      } else setError('Não foi possível registrar a resolução. Atualize e tente novamente.')
    } catch {
      setError('Não foi possível conectar. Confira a situação antes de tentar novamente.')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <h2 className="panel-section-title">Estornos</h2>
      <p className="panel-section-description">Confira solicitações e falhas antes de registrar uma resolução.</p>
      {error ? <ErrorState onRetry={() => void load()} /> : null}
      {!rows && !error ? <Loading /> : null}
      {rows && rows.length === 0 && !error ? <EmptyState>Nenhum estorno</EmptyState> : null}
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
                <Button type="button" loading={pending === row.orderId} disabled={pending !== null && pending !== row.orderId} onClick={() => void resolve(row.orderId)}>
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
