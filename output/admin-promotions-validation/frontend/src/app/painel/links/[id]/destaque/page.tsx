'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { orderParams, trackMeta } from '@/domain/meta-pixel'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'

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

type Duration = 7 | 14 | 28
type Surface = 'SEARCH' | 'NICHE' | 'HOME'
type Step = 'plan' | 'method' | 'pix' | 'card' | 'done'

type Offer = {
  code: string
  name: string
  featured: boolean
  surfaces: Surface[]
  prices: Array<{ durationDays: Duration; amountCents: number }>
}

type Catalog = {
  offers?: Offer[]
  cardEnabled?: boolean
  publishableKey?: string
}

type OrderView = {
  id: string
  linkId: string
  status: string
  amountCents: number
  productCode?: string
  durationDays?: number
  method?: 'PIX' | 'CARD'
  pixExpiresAt?: string | null
  brCode?: string
}

type Charge = {
  amountCents?: number
  orderId?: string
  brCode?: string
  clientSecret?: string
  message?: string
}

function attemptKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function priceOf(offer: Offer | undefined, days: Duration): number | null {
  return offer?.prices.find((row) => row.durationDays === days)?.amountCents ?? null
}

export default function Page() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [offers, setOffers] = useState<Offer[]>([])
  const [cardEnabled, setCardEnabled] = useState(false)
  const [publishableKey, setPublishableKey] = useState('')
  const [days, setDays] = useState<Duration>(28)
  const [selected, setSelected] = useState('')
  const [method, setMethod] = useState<'PIX' | 'CARD'>('PIX')
  const [step, setStep] = useState<Step>('plan')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('')
  const [brCode, setBrCode] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [qr, setQr] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(attemptKey)
  const tracked = useRef(new Set<string>())

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  )
  const current = offers.find((offer) => offer.code === selected)
  const planAmount = priceOf(current, days)
  const shownAmount = step === 'plan' || step === 'method' ? planAmount : (amount ?? planAmount)

  useEffect(() => {
    void (async () => {
      const result = await api<Catalog>('/v1/promotions/offers')
      if (result.status !== 200) {
        setMessage(result.status === 401 ? 'Entre para destacar este link.' : 'Não foi possível carregar os planos.')
        return
      }
      const rows = result.body.offers ?? []
      setOffers(rows)
      trackMeta('ViewContent', undefined, { content_type: 'product', content_ids: rows.map((offer) => offer.code) })
      setSelected((current) => current || rows.find((offer) => offer.featured)?.code || '')
      setCardEnabled(Boolean(result.body.cardEnabled && result.body.publishableKey))
      setPublishableKey(result.body.publishableKey ?? '')
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      const mine = await api<{ orders?: OrderView[] }>('/v1/orders/mine')
      const pending = (mine.body.orders ?? []).find((order) => order.linkId === params.id && order.status === 'PENDING_PAYMENT')
      if (!pending) return
      setOrderId(pending.id)
      setStatus(pending.status)
      setAmount(pending.amountCents)
      setStep('pix')
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
      if (result.body.status === 'PAID') purchased(result.body)
      if (result.body.status === 'PAID' || result.body.status === 'PAID_LATE') {
        setStep('done')
        return
      }
      if (result.body.status === 'EXPIRED') {
        setBrCode('')
        setQr('')
        setStep('plan')
        setIdempotencyKey(attemptKey())
        return
      }
      if (result.body.status !== 'PENDING_PAYMENT') return
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

  useEffect(() => {
    if (!brCode || step !== 'pix') {
      setQr('')
      return
    }
    let cancelled = false
    void import('qrcode').then((QR) => QR.toDataURL(brCode, { margin: 1, width: 220, errorCorrectionLevel: 'M' })).then((url) => {
      if (!cancelled) setQr(url)
    }).catch(() => {
      if (!cancelled) setQr('')
    })
    return () => {
      cancelled = true
    }
  }, [brCode, step])

  useEffect(() => {
    if (step !== 'done') return
    const timer = setTimeout(() => router.push('/painel/links'), 1400)
    return () => clearTimeout(timer)
  }, [step, router])

  function purchased(order: { id: string; amountCents: number; productCode?: string; durationDays?: number; method?: 'PIX' | 'CARD' }) {
    if (tracked.current.has(order.id)) return
    tracked.current.add(order.id)
    trackMeta('Purchase', `${order.id}:purchase`, orderParams({
      amountCents: order.amountCents,
      productCode: order.productCode ?? current?.code ?? '',
      durationDays: order.durationDays ?? days,
      method: order.method,
    }))
  }

  function startCheckout() {
    if (current) {
      const price = priceOf(current, days) ?? 0
      trackMeta('InitiateCheckout', `${idempotencyKey}:checkout`, orderParams({ amountCents: price, productCode: current.code, durationDays: days }))
    }
    setStep('method')
  }

  function chooseDays(value: Duration) {
    setDays(value)
    setMessage('')
    setIdempotencyKey(attemptKey())
  }

  function choosePlan(code: string) {
    setSelected(code)
    setMessage('')
    setIdempotencyKey(attemptKey())
  }

  async function pay(next: 'PIX' | 'CARD') {
    if (!current) return
    if (orderId && status === 'PENDING_PAYMENT' && next === 'PIX' && brCode) {
      setStep('pix')
      return
    }
    const result = await api<Charge>('/v1/promotions/checkout', {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify({
        linkId: params.id,
        surfaces: current.surfaces,
        durationDays: days,
        method: next,
      }),
    })
    if (!result.body.orderId) {
      setMessage(result.body.message ?? 'Não foi possível iniciar o pagamento.')
      return
    }
    const charged = result.body.amountCents ?? priceOf(current, days) ?? 0
    trackMeta('AddPaymentInfo', `${result.body.orderId}:payment`, orderParams({ amountCents: charged, productCode: current.code, durationDays: days, method: next }))
    setAmount(charged)
    setOrderId(result.body.orderId)
    setBrCode(result.body.brCode ?? '')
    setClientSecret(result.body.clientSecret ?? '')
    setStatus('PENDING_PAYMENT')
    setMessage('')
    setStep(next === 'CARD' ? 'card' : 'pix')
  }

  return (
    <div className="checkout">
      <h2 className="panel-section-title">Destaque</h2>
      {step === 'plan' ? (
        <>
          <div className="duration-tabs" role="radiogroup" aria-label="Duração">
            {([7, 14, 28] as const).map((value) => (
              <label key={value} className={days === value ? 'duration-tab is-on' : 'duration-tab'}>
                <input
                  type="radio"
                  name="duration"
                  aria-label={`${value} dias`}
                  checked={days === value}
                  onChange={() => chooseDays(value)}
                />
                {value} dias
              </label>
            ))}
          </div>
          <div className="plan-grid" role="radiogroup" aria-label="Plano">
            {offers.map((offer) => {
              const price = priceOf(offer, days)
              return (
                <label key={offer.code} className={selected === offer.code ? 'plan-card is-selected' : 'plan-card'}>
                  <input
                    type="radio"
                    name="plan"
                    aria-label={offer.name}
                    checked={selected === offer.code}
                    onChange={() => choosePlan(offer.code)}
                  />
                  {offer.featured ? <span className="plan-mark">Em destaque</span> : null}
                  <span className="plan-name">{offer.name}</span>
                  <span className="plan-price">{price !== null ? formatCents(price) : '—'}</span>
                </label>
              )
            })}
          </div>
          <Button type="button" disabled={!current} onClick={startCheckout}>Continuar</Button>
        </>
      ) : null}

      {step === 'method' ? (
        <section className="pay-step">
          <p className="pay-summary">{current?.name} · {days} dias · {shownAmount !== null ? formatCents(shownAmount) : ''}</p>
          {orderId && status === 'PENDING_PAYMENT' && amount !== null ? (
            <p className="pay-quiet">Há uma cobrança pendente de {formatCents(amount)}. Pagar volta para ela, sem abrir outra.</p>
          ) : null}
          <div className="method-grid" role="radiogroup" aria-label="Pagamento">
            <label className={method === 'PIX' ? 'method-card is-on' : 'method-card'}>
              <input type="radio" name="pay" aria-label="Pix" checked={method === 'PIX'} onChange={() => setMethod('PIX')} />
              <span className="plan-name">Pix</span>
              <span className="plan-mark">QR e copia e cola</span>
            </label>
            <label className={method === 'CARD' ? 'method-card is-on' : 'method-card'} aria-disabled={!cardEnabled}>
              <input
                type="radio"
                name="pay"
                aria-label="Cartão"
                checked={method === 'CARD'}
                disabled={!cardEnabled}
                onChange={() => setMethod('CARD')}
              />
              <span className="plan-name">Cartão</span>
              <span className="plan-mark">{cardEnabled ? 'Crédito' : 'Indisponível neste ambiente'}</span>
            </label>
          </div>
          <div className="step-actions">
            <Button type="button" variant="secondary" onClick={() => setStep('plan')}>Voltar</Button>
            {method === 'PIX' ? (
              <Button type="button" onClick={() => void pay('PIX')}>Pagar com Pix</Button>
            ) : (
              <Button type="button" disabled={!cardEnabled} onClick={() => void pay('CARD')}>Pagar com cartão</Button>
            )}
          </div>
        </section>
      ) : null}

      {step === 'pix' ? (
        <section className="pay-step pix-panel">
          {shownAmount !== null ? <p className="panel-amount">{formatCents(shownAmount)}</p> : null}
          {qr ? <img className="pix-qr" src={qr} alt="QR Code Pix" /> : null}
          {brCode ? (
            <>
              <code aria-label="Pix copia e cola">{brCode}</code>
              <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(brCode)}>Copiar código</Button>
            </>
          ) : status === 'PENDING_PAYMENT' ? <p role="status">Gerando cobrança Pix</p> : null}
          {orderId ? <p className="pay-quiet">Pedido <span aria-label="Pedido">{orderId}</span></p> : null}
          {status ? <p role="status" aria-label="Situação">{STATUS_LABEL[status] ?? status}</p> : null}
          <Button type="button" variant="secondary" onClick={() => setStep('method')}>Voltar</Button>
        </section>
      ) : null}

      {step === 'card' && clientSecret && stripePromise ? (
        <section className="pay-step">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardConfirm
              onBack={() => setStep('method')}
              onPaid={() => {
                if (orderId && amount !== null) purchased({ id: orderId, amountCents: amount, productCode: current?.code, durationDays: days, method: 'CARD' })
                setStep('done')
              }}
            />
          </Elements>
        </section>
      ) : null}

      {step === 'done' ? (
        <section className="pay-step">
          <p className="panel-amount" role="status">Concluído</p>
          <p className="pay-quiet">Voltando para os seus links.</p>
        </section>
      ) : null}

      {status === 'EXPIRED' && step === 'plan' ? (
        <p role="status" aria-label="Situação">Pix expirado</p>
      ) : null}
      {message ? <p role="alert">{message}</p> : null}
    </div>
  )
}

function CardConfirm({ onBack, onPaid }: { onBack: () => void; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (!stripe || !elements) return
    setBusy(true)
    const result = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    setBusy(false)
    if (result.error) {
      setError(result.error.message ?? 'Pagamento não concluído.')
      return
    }
    onPaid()
  }

  return (
    <form className="card-form" onSubmit={(event) => { event.preventDefault(); void confirm() }}>
      <PaymentElement />
      {error ? <p role="alert">{error}</p> : null}
      <div className="step-actions">
        <Button type="button" variant="secondary" onClick={onBack}>Voltar</Button>
        <Button type="submit" disabled={!stripe || busy}>Confirmar cartão</Button>
      </div>
    </form>
  )
}
