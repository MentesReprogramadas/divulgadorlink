'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'

type Duration = 7 | 14 | 28

type Offer = {
  code: string
  name: string
  sortOrder: number
  featured: boolean
  prices: Array<{ durationDays: Duration; amountCents: number }>
}

function reais(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function centsFrom(input: string): number | null {
  const raw = input.trim().replace(/^R\$\s*/, '')
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

function priceOf(offer: Offer, days: Duration): number | null {
  return offer.prices.find((row) => row.durationDays === days)?.amountCents ?? null
}

function move(list: Offer[], from: string, to: string): Offer[] {
  const next = [...list]
  const fromIndex = next.findIndex((row) => row.code === from)
  const toIndex = next.findIndex((row) => row.code === to)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item!)
  return next
}

function PlanDialog({
  offer,
  onClose,
  onSaved,
}: {
  offer: Offer
  onClose: () => void
  onSaved: (offers: Offer[], message: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [name, setName] = useState(offer.name)
  const [featured, setFeatured] = useState(offer.featured)
  const [drafts, setDrafts] = useState<Record<Duration, string>>({
    7: reais(priceOf(offer, 7) ?? 0),
    14: reais(priceOf(offer, 14) ?? 0),
    28: reais(priceOf(offer, 28) ?? 0),
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    function onCancel(event: Event) {
      event.preventDefault()
      if (!pendingRef.current) onCloseRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
    }
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const prices = ([7, 14, 28] as const).map((durationDays) => ({
      durationDays,
      amountCents: centsFrom(drafts[durationDays]),
    }))
    if (name.trim().length < 2 || prices.some((price) => price.amountCents === null || price.amountCents < 100 || price.amountCents > 1_000_000)) {
      setError('Nome curto ou preço fora de R$ 1,00 a R$ 10.000,00.')
      return
    }
    pendingRef.current = true
    setPending(true)
    const result = await api<{ offers?: Offer[]; message?: string }>(`/v1/admin/offers/${offer.code}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: name.trim(),
        featured,
        prices: prices.map((price) => ({ durationDays: price.durationDays, amountCents: price.amountCents })),
      }),
    })
    pendingRef.current = false
    setPending(false)
    if (result.status !== 200 || !result.body.offers) {
      setError(result.body.message ?? 'Não foi possível salvar.')
      return
    }
    onSaved(result.body.offers, 'Plano salvo. A próxima compra usa este preço.')
  }

  return (
    <dialog ref={ref} className="plan-dialog" aria-labelledby="plan-edit-title">
      <h2 id="plan-edit-title">Editar {offer.name}</h2>
      <form className="form-grid" onSubmit={(event) => void save(event)}>
        <Field label="Nome">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        {([7, 14, 28] as const).map((duration) => (
          <Field key={duration} label={`${duration} dias`}>
            <Input
              inputMode="decimal"
              value={drafts[duration]}
              onChange={(event) => setDrafts((current) => ({ ...current, [duration]: event.target.value }))}
            />
          </Field>
        ))}
        <label className="featured-choice">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          Card em destaque no checkout
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <div className="age-dialog-actions">
          <Button type="submit" disabled={pending}>Salvar</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </dialog>
  )
}

let offerCache: Offer[] | null = null

function remember(rows: Offer[]): Offer[] {
  offerCache = rows
  return rows
}

export function PlanEditor() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [days, setDays] = useState<Duration>(7)
  const [editing, setEditing] = useState<Offer | null>(null)
  const [message, setMessage] = useState('')
  const dragCode = useRef<string | null>(null)
  const startOrder = useRef<string[]>([])
  const offersRef = useRef(offers)
  offersRef.current = offers

  useLayoutEffect(() => {
    if (offerCache) setOffers(offerCache)
  }, [])

  useEffect(() => {
    void api<{ offers?: Offer[] }>('/v1/promotions/offers').then((result) => {
      setOffers(remember(result.body.offers ?? []))
    })
  }, [])

  function reorder(from: string, to: string) {
    setOffers((current) => {
      const next = remember(move(current, from, to))
      offersRef.current = next
      return next
    })
  }

  async function persist(list: Offer[]) {
    let failed = false
    const next = list.map((row, index) => ({ ...row, sortOrder: (index + 1) * 10 }))
    for (const row of next) {
      const previous = list.find((item) => item.code === row.code)
      if (!previous || previous.sortOrder === row.sortOrder) continue
      const result = await api<{ message?: string }>(`/v1/admin/offers/${row.code}`, {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: row.sortOrder }),
      })
      if (result.status !== 200) failed = true
    }
    if (failed) {
      setMessage('Não foi possível salvar a ordem.')
      const result = await api<{ offers?: Offer[] }>('/v1/promotions/offers')
      setOffers(remember(result.body.offers ?? []))
      return
    }
    setOffers(remember(next))
    setMessage('Ordem atualizada. O checkout segue esta sequência.')
  }

  return (
    <div className="plan-admin">
      <p className="pay-quiet">Os cards são os do checkout. Arraste para mudar a ordem. Editar abre o preço e o destaque.</p>
      <div className="duration-tabs" role="radiogroup" aria-label="Duração">
        {([7, 14, 28] as const).map((value) => (
          <label key={value} className={days === value ? 'duration-tab is-on' : 'duration-tab'}>
            <input
              type="radio"
              name="admin-duration"
              aria-label={`${value} dias`}
              checked={days === value}
              onChange={() => setDays(value)}
            />
            {value} dias
          </label>
        ))}
      </div>
      <div className="plan-grid">
        {offers.map((offer) => {
          const price = priceOf(offer, days)
          return (
            <article
              key={offer.code}
              className={offer.featured ? 'plan-card is-selected' : 'plan-card'}
              onDragOver={(event) => {
                event.preventDefault()
                const from = dragCode.current
                if (from && from !== offer.code) reorder(from, offer.code)
              }}
            >
              <button
                type="button"
                className="plan-drag"
                draggable
                aria-label={`Mover ${offer.name}`}
                onDragStart={() => {
                  dragCode.current = offer.code
                  startOrder.current = offersRef.current.map((row) => row.code)
                }}
                onDragEnd={() => {
                  const before = startOrder.current.join()
                  const after = offersRef.current.map((row) => row.code).join()
                  dragCode.current = null
                  if (before !== after) void persist(offersRef.current)
                }}
              >
                Arrastar
              </button>
              {offer.featured ? <span className="plan-mark">Em destaque</span> : <span className="plan-mark">Plano</span>}
              <span className="plan-name">{offer.name}</span>
              <span className="plan-price">{price !== null ? formatCents(price) : '—'}</span>
              <Button type="button" variant="secondary" onClick={() => setEditing(offer)}>Editar</Button>
            </article>
          )
        })}
      </div>
      {message ? <p role="status">{message}</p> : null}
      {editing ? (
        <PlanDialog
          offer={editing}
          onClose={() => setEditing(null)}
          onSaved={(rows, note) => {
            setOffers(remember(rows))
            setMessage(note)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
