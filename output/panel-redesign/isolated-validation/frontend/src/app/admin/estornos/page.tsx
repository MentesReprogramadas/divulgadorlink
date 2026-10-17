'use client'

import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { EmptyState } from '@/components/feedback/empty-state'
import { ListSkeleton } from '@/components/layout/workspace-skeleton'
import { formatCents } from '@/domain/money'
import { formatWhen } from '@/domain/format'
import { orderStatusLabel } from '@/domain/labels'
import { readSession } from '@/domain/session'
import { api } from '@/lib/api'
import { Field, Input, Select } from '@/components/ui/input'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'

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
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
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

  const visible = (rows ?? []).filter(row => (status === 'ALL' || row.status === status) && `${row.orderId} ${row.userName} ${row.userEmail} ${row.linkName}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim()))
  return (
    <>

      {error ? <ErrorState onRetry={() => void load()} /> : null}
      {!rows && !error ? <ListSkeleton kind="orders" /> : null}
      {rows ? <><WorkspaceActions><Button variant="secondary" onClick={() => { setQuery(''); setStatus('ALL') }}><ActionIcon name="resetFilters" />Limpar filtros</Button></WorkspaceActions><WorkspaceFilters label="Filtrar estornos"><Field label="Buscar estorno"><Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pedido, link ou responsável" /></Field><Field label="Situação do estorno"><Select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todas as situações</option>{Array.from(new Set(rows.map(row => row.status))).map(value => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}</Select></Field></WorkspaceFilters></> : null}
      {rows && !visible.length && !error ? <EmptyState /> : null}
      <div className="refund-grid">
        {visible.map((row) => {
          const user = [row.userName, row.userEmail].filter(Boolean).join(' · ') || row.userId || 'Usuário removido'
          const plan = `${PRODUCT[row.productCode] ?? row.productCode} · ${row.durationDays} dias · ${row.method === 'CARD' ? 'Cartão' : 'Pix'}`
          return (
            <article key={row.orderId} className="order-card">
              <p className="moderation-kicker">{orderStatusLabel(row.status)}</p>
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
                <Button type="button" loading={pending === row.orderId} disabled={pending !== null && pending !== row.orderId} onClick={() => void resolve(row.orderId)}><ActionIcon name="refund" />
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
