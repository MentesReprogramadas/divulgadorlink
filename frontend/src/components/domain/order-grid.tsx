import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/domain/money'
import { formatWhen } from '@/domain/format'
import { orderStatusLabel, orderStatusTone, surfaceLabel } from '@/domain/labels'
import type { PanelLink } from './panel-links'

export type PanelOrder = {
  id: string
  amountCents: number
  status: string
  linkId: string
  durationDays?: number
  surfaces?: string[]
  createdAt?: string
}

export function OrderGrid({ orders, links }: { orders: PanelOrder[]; links: PanelLink[] }) {
  if (orders.length === 0) return <p className="panel-empty">Nenhum pedido</p>
  return (
    <div className="order-grid">
      {orders.map((order) => {
        const name = links.find((link) => link.id === order.linkId)?.name ?? null
        const surfaces = (order.surfaces ?? []).map(surfaceLabel).filter((label): label is string => Boolean(label))
        const when = formatWhen(order.createdAt)
        return (
          <article key={order.id} className="order-card">
            <div className="order-card-top">
              <p className="panel-amount">{formatCents(order.amountCents)}</p>
              <Badge kind="status" tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
            </div>
            {name ? <p className="panel-order-name">{name}</p> : null}
            <p className="panel-meta">
              {[typeof order.durationDays === 'number' && order.durationDays > 0 ? `${order.durationDays} dias` : null, surfaces.join(', ') || null, when]
                .filter(Boolean)
                .join(' · ') || 'Pedido de destaque'}
            </p>
          </article>
        )
      })}
    </div>
  )
}
