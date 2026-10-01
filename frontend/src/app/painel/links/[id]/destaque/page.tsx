'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { readSession } from '@/domain/session'
import { api } from '@/lib/api'

const SURFACES = [
  { id: 'SEARCH', label: 'Busca' },
  { id: 'NICHE', label: 'Nicho' },
  { id: 'HOME', label: 'Home' },
] as const

const POLL_MS = 3_000
const POLL_ATTEMPTS = 20
const EXPIRY_GRACE_MS = 2_000
const EXPIRY_RECHECK_MS = 5_000
const EXPIRY_RECHECKS = 12

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Pendente',
  EXPIRED: 'Pix expirado',
  PAID: 'Pago',
  PAID_LATE: 'Pago após expirar',
}

type OrderView = {
  id: string
  linkId: string
  status: string
  amountCents: number
  pixExpiresAt?: string | null
  brCode?: string
}

function attemptKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function Page() {
  const params = useParams<{ id: string }>()
  const [selected, setSelected] = useState<string[]>([])
  const [days, setDays] = useState<7 | 14 | 28>(7)
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('')
  const [brCode, setBrCode] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(attemptKey)
  const banned = readSession()?.status === 'BANNED'

  useEffect(() => {
    void (async () => {
      const mine = await api<{ orders?: OrderView[] }>('/v1/orders/mine')
      const pending = (mine.body.orders ?? []).find((order) => order.linkId === params.id && order.status === 'PENDING_PAYMENT')
      if (!pending) return
      setOrderId(pending.id)
      setStatus(pending.status)
      setAmount(pending.amountCents)
    })()
  }, [params.id])

  useEffect(() => {
    if (!orderId || status !== 'PENDING_PAYMENT') return
    let stopped = false
    let codeAttempts = 0
    let expiryRechecks = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    async function check() {
      if (stopped) return
      const result = await api<OrderView>(`/v1/orders/${orderId}`)
      if (stopped || result.status !== 200) return
      setStatus(result.body.status)
      if (result.body.status !== 'PENDING_PAYMENT') {
        setIdempotencyKey(attemptKey())
        return
      }
      if (result.body.brCode) setBrCode(result.body.brCode)
      if (!result.body.brCode) {
        codeAttempts += 1
        if (codeAttempts < POLL_ATTEMPTS) timer = setTimeout(() => void check(), POLL_MS)
        return
      }
      const expiresAt = result.body.pixExpiresAt ? new Date(result.body.pixExpiresAt).getTime() : null
      if (expiresAt === null) return
      const untilExpiry = expiresAt + EXPIRY_GRACE_MS - Date.now()
      if (untilExpiry > 0) {
        timer = setTimeout(() => void check(), untilExpiry)
        return
      }
      expiryRechecks += 1
      if (expiryRechecks <= EXPIRY_RECHECKS) timer = setTimeout(() => void check(), EXPIRY_RECHECK_MS)
    }
    timer = setTimeout(() => void check(), 0)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [orderId, status])

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setAmount(null)
    setMessage('')
    setIdempotencyKey(attemptKey())
  }

  async function quote() {
    const result = await api<{ amountCents?: number; orderId?: string; brCode?: string; message?: string }>('/v1/promotions/checkout', {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify({ linkId: params.id, surfaces: selected, durationDays: days, method: 'PIX' }),
    })
    if (result.body.amountCents) {
      setAmount(result.body.amountCents)
      setOrderId(result.body.orderId ?? '')
      setBrCode(result.body.brCode ?? '')
      setStatus('PENDING_PAYMENT')
      setMessage('')
      return
    }
    setAmount(null)
    setMessage(result.body.message ?? 'Combinação não está disponível')
  }

  return (
    <main>
      <h1>Destaque</h1>
      {SURFACES.map((surface) => (
        <label key={surface.id}>
          <input type="checkbox" name={surface.label} checked={selected.includes(surface.id)} onChange={() => toggle(surface.id)} />
          {surface.label}
        </label>
      ))}
      {[7, 14, 28].map((value) => (
        <label key={value}>
          <input type="radio" name="duration" checked={days === value} onChange={() => { setDays(value as 7 | 14 | 28); setIdempotencyKey(attemptKey()) }} />
          {value} dias
        </label>
      ))}
      <Button type="button" onClick={() => void quote()}>Continuar</Button>
      {message ? <p>{message}</p> : null}
      {amount !== null ? <p>{formatCents(amount)}</p> : null}
      {orderId ? <p>Pedido<span aria-label="Pedido">{orderId}</span></p> : null}
      {orderId && status ? <p role="status" aria-label="Situação">{STATUS_LABEL[status] ?? status}</p> : null}
      {orderId && status === 'PENDING_PAYMENT' && brCode ? (
        <p>Pix copia e cola<code aria-label="Pix copia e cola">{brCode}</code></p>
      ) : null}
      {orderId && status === 'PENDING_PAYMENT' && !brCode ? <p role="status">Gerando cobrança Pix</p> : null}
      {!banned && amount !== null ? (
        <Button type="button" onClick={() => void api('/v1/promotions/renew', {
          method: 'POST',
          body: JSON.stringify({ linkId: params.id, surfaces: selected, durationDays: 28, method: 'PIX' }),
        })}>Renovar 28 dias</Button>
      ) : null}
      <p>Ativado <span aria-label="Ativado">—</span></p>
      <p>Expira <span aria-label="Expira">—</span></p>
    </main>
  )
}
