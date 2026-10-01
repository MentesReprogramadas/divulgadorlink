'use client'

import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/forms/login-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCents } from '@/domain/money'
import { clearSession, type Session } from '@/domain/session'
import { api, currentSession } from '@/lib/api'

type LinkRow = { id: string; name: string; status: string }
type OrderRow = { id: string; amountCents: number; status: string; linkId: string }
type Stats = { impressions: number; clicks: number; ctr: number }

const STATUS: Record<string, string> = {
  PUBLISHED: 'Publicado',
  PENDING_MODERATION: 'Em revisão',
  PRE_REJECTED: 'Rejeitado',
  UNAVAILABLE: 'Indisponível',
}

const ORDER_STATUS: Record<string, string> = {
  PENDING_PAYMENT: 'Pendente',
  PAID: 'Pago',
  EXPIRED: 'Expirado',
  PAID_LATE: 'Pago após o prazo',
  REFUND_PENDING: 'Estorno pendente',
  REFUNDED: 'Estornado',
  REFUND_FAILED: 'Estorno falhou',
}

export default function Page() {
  const [ready, setReady] = useState(false)
  const [links, setLinks] = useState<LinkRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [accountNote, setAccountNote] = useState('')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    void (async () => {
      const current = await currentSession()
      setSession(current)
      if (!current) {
        setReady(true)
        return
      }
      const mine = await api<{ links: LinkRow[] }>('/v1/links/mine')
      const orderList = await api<{ orders: OrderRow[] }>('/v1/orders/mine')
      setLinks(mine.body.links ?? [])
      setOrders(orderList.body.orders ?? [])
      const next: Record<string, Stats> = {}
      for (const link of mine.body.links ?? []) {
        const row = await api<Stats>(`/v1/analytics/links/${link.id}`)
        if (row.status === 200) next[link.id] = row.body
      }
      setStats(next)
      setReady(true)
    })()
  }, [])

  async function changeIdentifier(event: React.FormEvent<HTMLFormElement>, kind: 'email' | 'phone') {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = kind === 'email' ? 'email' : 'phone'
    const result = await api<{ message?: string; canSubmitLink?: boolean }>(`/v1/links/account/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ [field]: data.get(field) }),
    })
    setAccountNote(result.status === 200
      ? 'Confirme o novo identificador para voltar a enviar. Os links publicados continuam no ar.'
      : (result.body.message ?? 'Não foi possível alterar o identificador.'))
  }

  async function logout() {
    await api('/v1/auth/logout', { method: 'POST' })
    clearSession()
    window.location.href = '/painel'
  }

  async function saveText(event: React.FormEvent<HTMLFormElement>, linkId: string) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const result = await api<{ applied?: boolean; message?: string }>(`/v1/links/${linkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: data.get('name'), description: data.get('description') }),
    })
    const note = form.querySelector('[data-edit]')
    if (note) note.textContent = result.body.applied ? 'Texto publicado' : 'Proposta registrada'
  }

  if (!ready) return <main><p role="status" aria-label="Carregando">Carregando</p></main>
  if (!session) return <main><h1>Entrar</h1><LoginForm /></main>
  const banned = session.status === 'BANNED'
  return (
    <main>
      <h1>Painel</h1>
      <Button type="button" onClick={() => void logout()}>Sair</Button>
      {accountNote ? <p role="status">{accountNote}</p> : null}
      {!banned ? (
        <>
          <form onSubmit={(event) => void changeIdentifier(event, 'email')}>
            <label>Novo e-mail<Input name="email" type="email" /></label>
            <Button type="submit">Trocar e-mail</Button>
          </form>
          <form onSubmit={(event) => void changeIdentifier(event, 'phone')}>
            <label>Novo telefone<Input name="phone" /></label>
            <Button type="submit">Trocar telefone</Button>
          </form>
        </>
      ) : null}
      {banned ? <p>Conta suspensa</p> : <a href="/painel/links/novo">Novo link</a>}
      {links.length === 0 ? <p>Nenhum link</p> : null}
      {links.map((link) => (
        <article key={link.id} className="card">
          <h2>{link.name}</h2>
          <p>{STATUS[link.status] ?? link.status}</p>
          {link.status === 'PRE_REJECTED' ? <a href={`/painel/links/${link.id}/contestar`}>Contestar</a> : null}
          {link.status === 'PUBLISHED' && !banned ? <a href={`/painel/links/${link.id}/destaque`}>Destacar</a> : null}
          {link.status === 'PUBLISHED' && !banned ? (
            <form onSubmit={(event) => void saveText(event, link.id)}>
              <label>Novo nome<Input name="name" defaultValue={link.name} /></label>
              <label>Nova descrição<Input name="description" defaultValue="" /></label>
              <Button type="submit">Salvar texto</Button>
              <p data-edit></p>
            </form>
          ) : null}
          <p>{stats[link.id]?.impressions ?? 0} impressão</p>
          <p>{stats[link.id]?.clicks ?? 0} clique</p>
          <p>CTR {stats[link.id]?.ctr ?? 0}</p>
        </article>
      ))}
      {orders.length === 0 ? <p>Nenhum pedido</p> : null}
      {orders.map((order) => (
        <p key={order.id}>{formatCents(order.amountCents)} · {ORDER_STATUS[order.status] ?? order.status}</p>
      ))}
    </main>
  )
}
