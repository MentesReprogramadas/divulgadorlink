'use client'
import { Input } from '@/components/ui/input'

import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PlanCardsSkeleton } from '@/features/promotions/components/plans-skeleton'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { EmptyState } from '@/components/feedback/empty-state'
import { useRouter, useSearchParams } from 'next/navigation'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { orderParams, trackMeta } from '@/domain/meta-pixel'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'
import {LiquidLens} from '@/components/ui/liquid-lens'
import glass from '@/features/promotions/components/checkout-surfaces.module.css'
import styles from '@/features/promotions/components/promotion-checkout.module.css'
import { PromotionUpgrade } from '@/features/promotions/components/promotion-upgrade'
import { findPromotionUpgrade } from '@/domain/promotion-upgrade'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { OfferDeadlineBanner, OfferCountdown } from './components/offer-countdown'
import type { LaunchOffer } from '@/features/promotions/launch-offer'

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
type Step = 'plan' | 'method' | 'pix' | 'card' | 'confirming' | 'done'

type Offer = {
  code: string
  name: string
  featured: boolean
  surfaces: Surface[]
  prices: Array<{ durationDays: Duration; amountCents: number; referenceAmountCents?: number }>
}

type Catalog = {
  launchOffer?: LaunchOffer | null
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

function recordOfferEvent(offerId: string, event: 'viewed' | 'buy_clicked') {
  void api(`/v1/promotions/launch-offer/${encodeURIComponent(offerId)}/events`, {
    method: 'POST',
    body: JSON.stringify({ event }),
  }).catch(() => undefined)
}

type PromotionPurchaseProps = { linkId: string; mode?: 'post-create' | 'manual'; onLeave?: () => void }

export function PromotionPurchase({ linkId, mode = 'manual', onLeave }: PromotionPurchaseProps) {
  const search = useSearchParams()
  const renewal = search.get('renew')
  const requestedPlan = search.get('plan')
  const requestedDuration = Number(search.get('duration'))
  const initialDays: Duration = requestedDuration === 7 || requestedDuration === 14 || requestedDuration === 28 ? requestedDuration : mode === 'post-create' ? 7 : 28
  const renewalSurface = renewal && ['SEARCH', 'NICHE', 'HOME'].includes(renewal) ? renewal : null
  const router = useRouter()
  const [offers, setOffers] = useState<Offer[]>([])
  const [offersReady, setOffersReady] = useState(false)
  const [ordersReady, setOrdersReady] = useState(false)
  const [ordersAttempt, setOrdersAttempt] = useState(0)
  const [ordersError, setOrdersError] = useState(false)
  const [launchOffer, setLaunchOffer] = useState<LaunchOffer | null>(null)
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [paying, setPaying] = useState(false)
  const payLock = useRef(false)
  const [cardSubmitting, setCardSubmitting] = useState(false)
  const [exitPreparing, setExitPreparing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leavingLock = useRef(false)
  const interactionLocked = paying || cardSubmitting || exitPreparing || leaving
  const [pollAttempt, setPollAttempt] = useState(0)
  const [cardEnabled, setCardEnabled] = useState(false)
  const [publishableKey, setPublishableKey] = useState('')
  const [days, setDays] = useState<Duration>(initialDays)
  const [selected, setSelected] = useState('')
  const [baseSelected, setBaseSelected] = useState('')
  const [exitOpen, setExitOpen] = useState(false)
  const exitAttempted = useRef(false)
  const exitBusy = useRef(false)
  const leaveDestination = useRef<() => void>(() => router.push('/painel/links'))
  const titleRef = useRef<HTMLHeadingElement>(null)
  const exitOfferRef = useRef<HTMLElement>(null)
  const viewedOffers = useRef(new Set<string>())
  const [method, setMethod] = useState<'PIX' | 'CARD'>('PIX')
  const [step, setStep] = useState<Step>('plan')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('')
  const [brCode, setBrCode] = useState('')
  const [qr, setQr] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(attemptKey)
  const tracked = useRef(new Set<string>())
  const restoringPending = useRef(false)
  const summaryRef = useRef<HTMLElement>(null)
  const [upgradeMessage, setUpgradeMessage] = useState('')

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  )
  const current = offers.find((offer) => offer.code === selected)
  const planAmount = priceOf(current, days)
  const pendingPayment = Boolean(orderId && status === 'PENDING_PAYMENT')
  const shownAmount = pendingPayment || step !== 'plan' && step !== 'method' ? (amount ?? planAmount) : planAmount
  const priceRow = current?.prices.find(row => row.durationDays === days)
  const referenceAmount = priceRow?.referenceAmountCents
  const discounted = !pendingPayment && Boolean(launchOffer && planAmount !== null && referenceAmount !== undefined && referenceAmount > planAmount)
  const upgrade = !renewalSurface && !pendingPayment ? findPromotionUpgrade(offers.find(offer => offer.code === (baseSelected || selected)), offers, days) : null
  const upgradeAvailable = upgrade !== null
  const upgradeSelected = Boolean(upgrade && selected === upgrade.offer.code)
  const selectionVisible = step === 'plan' || step === 'method'
  const PurchaseHeading = mode === 'post-create' ? 'h1' : 'h2'
  const SummaryHeading = mode === 'post-create' ? 'h2' : 'h3'
  const visibleOfferId = selectionVisible && offersReady && discounted ? launchOffer?.id : undefined

  useEffect(() => {
    const target = exitOpen ? exitOfferRef.current : titleRef.current
    if (!visibleOfferId || !target || viewedOffers.current.has(visibleOfferId) || typeof IntersectionObserver === 'undefined') return
    let inViewport = false
    function recordIfVisible() {
      if (!visibleOfferId || !inViewport || document.visibilityState !== 'visible' || viewedOffers.current.has(visibleOfferId)) return
      viewedOffers.current.add(visibleOfferId)
      recordOfferEvent(visibleOfferId, 'viewed')
    }
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting && entry.intersectionRatio > 0
      recordIfVisible()
    })
    observer.observe(target)
    document.addEventListener('visibilitychange', recordIfVisible)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', recordIfVisible)
    }
  }, [visibleOfferId, exitOpen])

  useEffect(() => { if (mode === 'post-create' && offersReady) titleRef.current?.focus() }, [mode, offersReady])


  useEffect(() => {
    let live = true
    void (async () => {
      if (mode === 'post-create' && catalogAttempt === 0) await api('/v1/promotions/launch-offer', { method: 'POST', body: JSON.stringify({ linkId }) })
      const result = await api<Catalog>(`/v1/promotions/offers?linkId=${encodeURIComponent(linkId)}${renewalSurface ? '&renewal=1' : ''}`)
      if (!live) return
      if (result.status !== 200) {
        setMessage(result.status === 401 ? 'Entre para destacar este link.' : 'Não foi possível carregar os planos.')
        return
      }
      const rows = (result.body.offers ?? []).filter(offer => !renewalSurface || (offer.surfaces.length === 1 && offer.surfaces[0] === renewalSurface))
      setOffers(rows)
      const activeLaunch = !renewalSurface ? result.body.launchOffer ?? null : null
      setLaunchOffer(activeLaunch)
      if (activeLaunch && catalogAttempt === 0 && !restoringPending.current) setDays(requestedDuration === 7 || requestedDuration === 14 || requestedDuration === 28 ? requestedDuration : activeLaunch.durationDays ?? 7)
      trackMeta('ViewContent', undefined, { content_type: 'product', content_ids: rows.map((offer) => offer.code) })
      setSelected((current) => rows.some(offer => offer.code === current) ? current : (renewalSurface ? rows[0]?.code : rows.find(offer => offer.code === (requestedPlan ?? activeLaunch?.productCode))?.code ?? (activeLaunch ? rows.find(offer => offer.code === 'SEARCH_NICHE')?.code : undefined) ?? rows.find(offer => offer.featured)?.code) || '')
      setCardEnabled(Boolean(result.body.cardEnabled && result.body.publishableKey))
      setPublishableKey(result.body.publishableKey ?? '')
    })().catch(() => { if (live) setMessage('Não foi possível carregar os planos. Tente novamente.') }).finally(() => { if (live) setOffersReady(true) })
    return () => { live = false }
  }, [renewalSurface, linkId, catalogAttempt, requestedPlan, requestedDuration, mode])

  useEffect(() => { if (!baseSelected && selected) setBaseSelected(selected) }, [selected, baseSelected])

  useEffect(() => {
    if (!launchOffer || pendingPayment) return
    const remaining = new Date(launchOffer.expiresAt).getTime() - Date.now()
    const timer = setTimeout(() => {
      setLaunchOffer(null)
      setOffersReady(false)
      setMessage('A oferta encerrou. Confira os valores atualizados antes de pagar.')
      setCatalogAttempt(attempt => attempt + 1)
    }, Math.max(0, Math.min(remaining, 2_147_483_647)))
    return () => clearTimeout(timer)
  }, [launchOffer, pendingPayment])

  useEffect(() => {
    let live = true
    setOrdersReady(false)
    setOrdersError(false)
    void (async () => {
      const mine = await api<{ orders?: OrderView[] }>('/v1/orders/mine')
      if (!live) return
      if (mine.status !== 200) throw new Error('orders_unavailable')
      setOrdersReady(true)
      const pending = (mine.body.orders ?? []).find((order) => order.linkId === linkId && order.status === 'PENDING_PAYMENT')
      if (!pending) return
      restoringPending.current = true
      setOrderId(pending.id)
      setStatus(pending.status)
      setAmount(pending.amountCents)
      if (pending.productCode) setSelected(pending.productCode)
      if (pending.durationDays === 7 || pending.durationDays === 14 || pending.durationDays === 28) setDays(pending.durationDays)
      setMethod(pending.method === 'CARD' ? 'CARD' : 'PIX')
      setStep(pending.method === 'CARD' ? 'method' : 'pix')
    })().catch(() => { if (live) setOrdersError(true) })
    return () => { live = false }
  }, [linkId, ordersAttempt])

  useEffect(() => {
    if (!orderId || status !== 'PENDING_PAYMENT') return
    let stopped = false
    let codeAttempts = 0
    let expiryRechecks = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    async function check() {
      if (stopped) return
      try {
      const result = await api<OrderView>(`/v1/orders/${orderId}`)
      if (stopped) return
      if (result.status !== 200) throw new Error('order_unavailable')
      setStatus(result.body.status)
      if (result.body.status === 'PAID') purchased(result.body)
      if (result.body.status === 'PAID' || ['PAID_LATE', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'].includes(result.body.status)) {
        setStep('done')
        return
      }
      if (result.body.status === 'EXPIRED') {
        restoringPending.current = false
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
      if (expiresAt === null) {
        timer = setTimeout(() => void check(), POLL_MS)
        return
      }
      const untilExpiry = expiresAt + EXPIRY_GRACE_MS - Date.now()
      if (untilExpiry > 0) {
        timer = setTimeout(() => void check(), Math.min(POLL_MS, untilExpiry))
        return
      }
      expiryRechecks += 1
      if (expiryRechecks <= EXPIRY_RECHECKS) timer = setTimeout(() => void check(), EXPIRY_RECHECK_MS)
      } catch {
        if (stopped) return
        setMessage('Não foi possível atualizar o pagamento. Você pode tentar novamente sem pagar outra vez.')
        codeAttempts += 1
        if (codeAttempts < POLL_ATTEMPTS) timer = setTimeout(() => void check(), POLL_MS)
      }
    }
    timer = setTimeout(() => void check(), 0)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [orderId, status, pollAttempt])

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

  function purchased(order: { id: string; amountCents: number; productCode?: string; durationDays?: number; method?: 'PIX' | 'CARD' }) {
    if (tracked.current.has(order.id)) return
    tracked.current.add(order.id)
    window.dispatchEvent(new Event('promotion-purchase-completed'))
    trackMeta('Purchase', `${order.id}:purchase`, orderParams({
      amountCents: order.amountCents,
      productCode: order.productCode ?? current?.code ?? '',
      durationDays: order.durationDays ?? days,
      method: order.method,
    }))
  }

  function chooseDays(value: Duration) {
    if (pendingPayment || interactionLocked) return
    setDays(value)
    setMessage('')
    setIdempotencyKey(attemptKey())
  }

  function choosePlan(code: string) {
    if (pendingPayment || interactionLocked) return
    setSelected(code)
    setBaseSelected(code)
    setMessage('')
    setIdempotencyKey(attemptKey())
  }

  async function pay(next: 'PIX' | 'CARD') {
    if (!current || payLock.current || leavingLock.current || exitPreparing || !offersReady || !ordersReady) return
    if (!pendingPayment && launchOffer && Date.parse(launchOffer.expiresAt) <= Date.now()) {
      setLaunchOffer(null); setOffersReady(false); setCatalogAttempt(value => value + 1); setMessage('A oferta encerrou. Confira os valores atualizados antes de pagar.'); return
    }
    trackMeta('InitiateCheckout', `${idempotencyKey}:checkout`, orderParams({ amountCents: planAmount ?? 0, productCode: current.code, durationDays: days }))
    if (orderId && status === 'PENDING_PAYMENT' && next === 'PIX' && brCode) {
      setStep('pix')
      return
    }
    exitAttempted.current = true
    payLock.current = true
    setPaying(true)
    if (visibleOfferId) recordOfferEvent(visibleOfferId, 'buy_clicked')
    const expectedAmount = shownAmount
    try {
    void clearHistoryGuard()
    const result = await api<Charge>(pendingPayment ? `/v1/orders/${orderId}/resume` : renewalSurface ? '/v1/promotions/renew' : '/v1/promotions/checkout', {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: pendingPayment ? undefined : JSON.stringify({
        linkId: linkId,
        surfaces: current.surfaces,
        durationDays: days,
        method: next,
        ...(!renewalSurface && launchOffer ? { launchOfferId: launchOffer.id } : {}),
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
    setStatus('PENDING_PAYMENT')
    setMessage('')
    if (charged !== expectedAmount) {
      setMessage(`O valor atualizado é ${formatCents(charged)}. Confira o total e confirme a compra novamente no mesmo pedido.`)
      return
    }
    if (next === 'PIX') setStep('pix')
    return result.body.clientSecret
    } catch {
      setMessage('Não foi possível iniciar o pagamento. Sua seleção foi mantida; tente novamente.')
    } finally {
      payLock.current = false
      setPaying(false)
    }
  }

  async function declineInitialOffer() {
    if (leavingLock.current || payLock.current || cardSubmitting || exitPreparing) return
    leavingLock.current = true
    setLeaving(true)
    try {
      if (launchOffer && current) {
        const signal = AbortSignal.timeout(3000)
        // O limite também cobre bootstrap CSRF/refresh anteriores ao fetch com signal.
        await Promise.race([
          api('/v1/promotions/launch-offer', {
            method: 'POST', signal,
            body: JSON.stringify({ linkId, source: 'post_create', productCode: current.code, durationDays: days }),
          }),
          new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
        ])
      }
    } catch { /* Falha ao salvar a seleção nunca impede a saída. */ }
    finally {
      if (onLeave) onLeave(); else router.push('/painel/links')
    }
  }

  async function attemptExit(leave: () => void) {
    const completeLeave = () => { exitAttempted.current = true; void clearHistoryGuard().then(leave) }
    if (exitBusy.current) { completeLeave(); return }
    if (mode !== 'manual' || renewalSurface || !selectionVisible || pendingPayment || !ordersReady || interactionLocked || !current || exitAttempted.current) { completeLeave(); return }
    exitBusy.current = true
    setExitPreparing(true)
    leaveDestination.current = () => { exitAttempted.current = true; void clearHistoryGuard().then(leave) }
    try {
      const claimed = await api<{ offer?: LaunchOffer | null }>('/v1/promotions/launch-offer', { method: 'POST', body: JSON.stringify({ linkId, source: 'exit', productCode: current.code, durationDays: days }) })
      const offer = claimed.body.offer
      if ((claimed.status !== 200 && claimed.status !== 201) || !offer || Date.parse(offer.expiresAt) <= Date.now()) { completeLeave(); return }
      const key = `promotion-exit:${offer.id}`
      let shown = false
      try { shown = sessionStorage.getItem(key) === 'shown' } catch { /* O estado local também limita a apresentação. */ }
      if (shown) { exitAttempted.current = true; completeLeave(); return }
      const catalog = await api<Catalog>(`/v1/promotions/offers?linkId=${encodeURIComponent(linkId)}`)
      if (catalog.status !== 200 || catalog.body.launchOffer?.id !== offer.id || !catalog.body.offers?.some(row => row.code === current.code && priceOf(row, days) !== null)) { completeLeave(); return }
      if (exitAttempted.current) return
      exitAttempted.current = true
      try { sessionStorage.setItem(key, 'shown') } catch { /* Sem armazenamento, uma apresentação nesta montagem. */ }
      setOffers(catalog.body.offers)
      setLaunchOffer(offer)
      setExitOpen(true)
    } catch { completeLeave() } finally { exitBusy.current = false; setExitPreparing(false) }
  }

  useEffect(() => {
    if (mode !== 'manual' || renewalSurface || !selectionVisible || pendingPayment || !ordersReady || interactionLocked || !offersReady || !current) return
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self' || anchor.closest('dialog')) return
      const url = new URL(anchor.href, location.href)
      if (url.origin !== location.origin || url.hash || url.pathname === location.pathname && url.search === location.search) return
      event.preventDefault(); event.stopPropagation()
      void attemptExit(() => router.push(`${url.pathname}${url.search}`))
    }
    document.addEventListener('click', navigate, true)
    return () => document.removeEventListener('click', navigate, true)
  })

  const historyGuard = useRef(false)
  async function clearHistoryGuard() {
    if (!historyGuard.current || history.state?.promotionExitGuard !== linkId) return
    historyGuard.current = false
    await new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); window.removeEventListener('popstate', finish); resolve() }
      window.addEventListener('popstate', finish, { once: true })
      const timer = setTimeout(finish, 200)
      history.back()
    })
  }

  useEffect(() => () => {
    if (historyGuard.current && history.state?.promotionExitGuard === linkId) {
      historyGuard.current = false
      history.back()
    }
  }, [linkId])
  useEffect(() => {
    if (mode !== 'manual' || renewalSurface || !offersReady || !current || pendingPayment || !ordersReady || interactionLocked || !selectionVisible) return
    if (!historyGuard.current && !exitAttempted.current) {
      historyGuard.current = true
      history.pushState({ ...history.state, promotionExitGuard: linkId }, '', location.href)
    }
    function back() {
      if (!historyGuard.current) return
      historyGuard.current = false
      void attemptExit(() => history.back())
    }
    window.addEventListener('popstate', back)
    return () => window.removeEventListener('popstate', back)
  })

  function renderMethods() {
    return <section className={styles.methodChoices} aria-label="Forma de pagamento">
      {pendingPayment && amount !== null ? <p>Há uma cobrança pendente de {formatCents(amount)}. A compra retoma o mesmo pedido.</p> : null}
      <div className="method-grid" role="radiogroup" aria-label="Pagamento">
        <label className={method === 'PIX' ? 'method-card is-on' : 'method-card'}><Input type="radio" name="pay" aria-label="Pix" checked={method === 'PIX'} disabled={interactionLocked || pendingPayment && method !== 'PIX'} onChange={() => setMethod('PIX')} /><span>Pix</span></label>
        <label className={method === 'CARD' ? 'method-card is-on' : 'method-card'}><Input type="radio" name="pay" aria-label="Cartão" checked={method === 'CARD'} disabled={interactionLocked || !cardEnabled || pendingPayment && method !== 'CARD'} onChange={() => setMethod('CARD')} /><span>Cartão</span></label>
      </div>
      {method === 'CARD' ? <p className={styles.finePrint}>Preencha os campos seguros abaixo. Seu banco pode solicitar autenticação.</p> : null}
    </section>
  }

  function buyButton() {
    if (method === 'CARD' && stripePromise && shownAmount !== null) return <Elements stripe={stripePromise} options={{ mode: 'payment', amount: shownAmount, currency: 'brl', allowedPaymentMethodTypes: ['card'] }}>
      <CardConfirm onBusyChange={setCardSubmitting} amount={shownAmount} disabled={!current || !offersReady || !ordersReady || !cardEnabled || leaving || exitPreparing || paying} onStart={() => pay('CARD')} onPaid={() => { setStep('confirming'); setPollAttempt(value => value + 1) }} />
    </Elements>
    return <Button type="button" loading={paying} disabled={!current || planAmount === null || !offersReady || !ordersReady || interactionLocked || method === 'CARD' && !cardEnabled} onClick={() => void pay(method)}><ActionIcon name={method === 'PIX' ? 'pix' : 'payment'} />Comprar por {shownAmount !== null ? formatCents(shownAmount) : '—'}</Button>
  }

  function renderSummary(action: ReactNode) {
    return (
      <section ref={summaryRef} className={styles.summary} aria-label="Resumo do destaque">
        <SummaryHeading className={mode === 'post-create' ? styles.srOnly : undefined}>Resumo do destaque</SummaryHeading>
        {launchOffer ? <p className={styles.summaryInfo}>{launchOffer.linkName}</p> : null}
        <p>{current?.name ?? 'Escolha um plano'} · {days} dias</p>
        {discounted && launchOffer ? <span className={styles.discount}>{launchOffer.discountPercent}% OFF</span> : null}
        {discounted && referenceAmount !== undefined ? <p className={styles.reference}>De <s>{formatCents(referenceAmount)}</s> por</p> : null}
        <strong className={styles.price}>{shownAmount !== null ? formatCents(shownAmount) : '—'}</strong>
        {discounted && referenceAmount !== undefined && planAmount !== null ? <p className={styles.saving}>Você economiza {formatCents(referenceAmount - planAmount)}</p> : null}
        {mode !== 'post-create' && launchOffer && !pendingPayment ? <p className={styles.finePrint}>Oferta até {new Date(launchOffer.expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (Brasília).</p> : null}
        {mode !== 'post-create' ? <p className={styles.total}><span>Total a pagar</span><strong>{shownAmount !== null ? formatCents(shownAmount) : '—'}</strong></p> : null}
        {upgrade ? <PromotionUpgrade compact={mode === 'post-create'} disabled={interactionLocked} selected={upgradeSelected} durationDays={days} additionalCents={upgrade.additionalCents} totalCents={upgrade.totalCents} missingSurfaces={upgrade.missingSurfaces} onSelect={() => {
          if (interactionLocked) return
          setSelected(upgradeSelected ? baseSelected : upgrade.offer.code)
          setIdempotencyKey(attemptKey())
          setUpgradeMessage(upgradeSelected ? 'Complemento removido.' : `Pacote atualizado. Total: ${formatCents(upgrade.totalCents)}.`)
        }} /> : null}
        {renderMethods()}
        {action}
        {mode === 'post-create' && selectionVisible ? <button type="button" className={styles.textExit} disabled={interactionLocked} onClick={() => void declineInitialOffer()}>{leaving ? 'Saindo…' : 'Agora não'}</button> : null}
        {upgradeMessage ? <p className={styles.srOnly} role="status">{upgradeMessage}</p> : null}
        <p className={styles.finePrint}>Publicar continua grátis. Destaque é publicidade paga, sem garantia de acessos.</p>
      </section>
    )
  }

  function renderPayment() {
    return <>
      {step === 'pix' ? (
        <section className={`pay-step pix-panel ${glass.step}`}><LiquidLens radius={16}/>
          {shownAmount !== null ? <p className="panel-amount">{formatCents(shownAmount)}</p> : null}
          {qr ? <img className="pix-qr" src={qr} alt="QR Code Pix" /> : <SkeletonRegion label="Carregando QR Code"><div className="pix-qr"><Skeleton width="100%" height="100%" /></div></SkeletonRegion>}
          {brCode ? (
            <>
              <code aria-label="Pix copia e cola">{brCode}</code>
              <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(brCode)}><ActionIcon name="copy" />Copiar código</Button>
            </>
          ) : status === 'PENDING_PAYMENT' ? <p role="status">Gerando cobrança Pix</p> : null}
          {orderId ? <p className="pay-quiet">Pedido <span aria-label="Pedido">{orderId}</span></p> : null}
          {status ? <p role="status" aria-label="Situação">{STATUS_LABEL[status] ?? status}</p> : null}
          {pendingPayment ? <Button type="button" variant="secondary" onClick={() => { setMessage(''); setPollAttempt(value => value + 1) }}>Atualizar pagamento</Button> : null}
          <Button type="button" variant="secondary" onClick={() => setStep('method')}><ActionIcon name="back" />Voltar</Button>
        </section>
      ) : null}

      {step === 'confirming' ? <section className={`${styles.statusPanel} ${glass.step}`}><LiquidLens radius={16}/><p role="status">Confirmando seu pagamento</p><p className="pay-quiet">Aguarde a confirmação do servidor. Você não precisa pagar novamente.</p><Button type="button" variant="secondary" onClick={() => { setMessage(''); setPollAttempt(value => value + 1) }}>Atualizar pagamento</Button></section> : null}

      {step === 'done' ? (
        <section className={`pay-step ${glass.step}`}><LiquidLens radius={16}/>
          <PurchaseHeading ref={titleRef} tabIndex={-1} className="panel-amount" aria-live="polite">{status === 'PAID' ? 'Pagamento confirmado' : 'Pagamento recebido após o prazo'}</PurchaseHeading>
          <p className="pay-quiet">{status === 'PAID' ? 'Seu destaque é ativado automaticamente. Acompanhe a situação e os resultados no painel.' : 'Esta cobrança não ativou o destaque. Acompanhe o andamento do estorno nos seus pedidos.'}</p>
          <Button type="button" onClick={() => router.push(status === 'PAID' ? `/painel/links/${linkId}/resultado` : '/painel/pedidos')}>{status === 'PAID' ? <><ActionIcon name="chart" />Acompanhar resultados</> : 'Ver meus pedidos'}</Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/painel/links')}><ActionIcon name="link" />Voltar aos meus links</Button>
        </section>
      ) : null}

    </>
  }

  return (
    <div className={`checkout ${styles.purchase}`} data-mode={mode}>
      {launchOffer && !pendingPayment && step !== 'done' ? <OfferDeadlineBanner expiresAt={launchOffer.expiresAt} /> : null}
      {step !== 'done' ? <div className={styles.intro}>
        <PurchaseHeading ref={titleRef} tabIndex={-1} className={launchOffer ? styles.offerTitle : undefined}>{renewalSurface ? 'Renovar destaque' : launchOffer ? `Destaque seu link com ${launchOffer.discountPercent}% OFF` : 'Escolha onde aparecer'}</PurchaseHeading>
        <p>{mode === 'post-create' ? 'Link cadastrado. Aproveite para destacá-lo.' : 'Escolha os espaços patrocinados e revise o valor antes de pagar.'}</p>
      </div> : null}
      {selectionVisible && !exitOpen ? (
        <div className={styles.layout}>
          {mode === 'post-create' ? renderSummary(buyButton()) : null}
          <div className={`${styles.options} ${styles.planOptions}`}>
            {pendingPayment ? <p role="status">Retomando o pedido pendente com o plano, a duração e o valor originais.</p> : null}
            <div className="duration-tabs" role="radiogroup" aria-label="Duração">
              {([7, 14, 28] as const).map(value => (
                <label key={value} className={`${days === value ? 'duration-tab is-on' : 'duration-tab'} ${glass.choice}`}><LiquidLens radius={16}/>
                  <Input type="radio" name="duration" aria-label={`${value} dias`} checked={days === value} disabled={pendingPayment || interactionLocked} onChange={() => chooseDays(value)} />
                  {value} dias
                </label>
              ))}
            </div>
            {!offersReady ? <PlanCardsSkeleton /> : null}
            {offersReady && !message && !offers.length ? <EmptyState>Não há opções de destaque disponíveis para este link no momento.</EmptyState> : null}
            {launchOffer && !pendingPayment && current ? <section className={styles.campaignPlan} aria-label="Plano escolhido"><h3>{current.name} · {days} dias</h3><p>Espaços incluídos: {current.surfaces.map(surface => ({ SEARCH: 'Busca', NICHE: 'seu nicho', HOME: 'página inicial' })[surface]).join(' + ')}.</p>{upgradeAvailable ? <p>Você pode adicionar os espaços que faltam no resumo da compra.</p> : null}</section> : null}
            <details className={styles.otherPlans} open={!launchOffer || pendingPayment}>
            <summary>Ver outros espaços de destaque</summary>
            <div className="plan-grid" role="radiogroup" aria-label="Plano" aria-busy={!offersReady}>
              {offers.map(offer => {
                const price = priceOf(offer, days)
                const reference = offer.prices.find(row => row.durationDays === days)?.referenceAmountCents
                return (
                  <label key={offer.code} className={`${selected === offer.code ? 'plan-card is-selected' : 'plan-card'} ${glass.choice}`}><LiquidLens radius={16}/>
                    <Input type="radio" name="plan" aria-label={offer.name} checked={selected === offer.code} disabled={pendingPayment || interactionLocked || price === null} onChange={() => choosePlan(offer.code)} />
                    {offer.featured ? <span className="plan-mark">Recomendado</span> : null}
                    <span className="plan-name">{offer.name}</span>
                    {reference !== undefined && price !== null && reference > price ? <s className={styles.referenceSmall}>{formatCents(reference)}</s> : null}
                    <span className="plan-price">{price !== null ? formatCents(price) : '—'}</span>
                  </label>
                )
              })}
            </div>
            </details>
          </div>
          {mode === 'manual' ? renderSummary(buyButton()) : null}
        </div>
      ) : null}

      {!exitOpen ? renderPayment() : null}
      {ordersError ? <div role="alert">Não foi possível conferir seus pedidos pendentes. <Button type="button" variant="secondary" onClick={() => setOrdersAttempt(value => value + 1)}>Tentar carregar pagamento</Button></div> : null}
      {status === 'EXPIRED' && step === 'plan' ? (
        <p role="status" aria-label="Situação">Pix expirado</p>
      ) : null}
      {mode === 'manual' && selectionVisible && !exitOpen ? <Button type="button" variant="secondary" onClick={() => void attemptExit(() => router.push('/painel/links'))}>Voltar para Meus links</Button> : null}
      {message && !exitOpen ? <p role="alert">{message}</p> : null}
      <OverlayDialog open={exitOpen} title={step === 'done' ? status === 'PAID' ? 'Compra concluída' : 'Pagamento recebido' : launchOffer ? `Seu destaque com ${launchOffer.discountPercent}% OFF` : 'Oferta encerrada'} hideCloseButton closeDisabled onClose={() => setExitOpen(false)}>
        {selectionVisible ? <section ref={exitOfferRef} className={styles.exitOffer} aria-label="Oferta de saída">
          {launchOffer ? <div className={styles.exitDeadline}><p>Oferta por tempo limitado</p><OfferCountdown expiresAt={launchOffer.expiresAt} /></div> : null}
          <p className={styles.exitPlan}>{current?.name} · {days} dias</p>
          {discounted && referenceAmount !== undefined ? <p className={styles.reference}>De <s>{formatCents(referenceAmount)}</s> por</p> : null}
          <strong className={styles.price}>{shownAmount !== null ? formatCents(shownAmount) : '—'}</strong>
          {discounted && referenceAmount !== undefined && planAmount !== null ? <p className={styles.saving}>Economize {formatCents(referenceAmount - planAmount)}</p> : null}
          {renderMethods()}
          {buyButton()}
        </section> : renderPayment()}
        {message ? <p role="alert">{message}</p> : null}
        {step !== 'done' ? <button type="button" className={styles.textExit} onClick={() => { setExitOpen(false); leaveDestination.current() }}>Sair sem destacar</button> : null}
      </OverlayDialog>
    </div>
  )
}

function CardConfirm({ amount, disabled, onStart, onPaid, onBusyChange }: { onBusyChange: (busy: boolean) => void; amount: number; disabled: boolean; onStart: () => Promise<string | undefined>; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (!stripe || !elements || busy || disabled) return
    setBusy(true)
    onBusyChange(true)
    setError('')
    try {
      const submitted = await elements.submit()
      if (submitted.error) { setError(submitted.error.message ?? 'Confira os dados do cartão.'); return }
      const clientSecret = await onStart()
      if (!clientSecret) return
      const result = await stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: location.href }, redirect: 'if_required' })
      if (result.error) { setError(result.error.message ?? 'Pagamento não concluído.'); return }
      onPaid()
    } catch { setError('Não foi possível confirmar o cartão. Tente novamente no mesmo pedido.') }
    finally { setBusy(false); onBusyChange(false) }
  }

  return <form className="card-form" onSubmit={event => { event.preventDefault(); void confirm() }}>
    <PaymentElement />
    {error ? <p role="alert">{error}</p> : null}
    <Button type="submit" loading={busy} disabled={disabled || !stripe || !elements || busy}><ActionIcon name="payment" />Comprar por {formatCents(amount)}</Button>
  </form>
}
