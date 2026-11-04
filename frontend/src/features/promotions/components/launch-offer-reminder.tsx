'use client'

import { useEffect, useId, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button, ButtonLink } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCents } from '@/domain/money'
import { type LaunchOffer, type LaunchOfferPrice, offerSecondsRemaining } from '../launch-offer'
import { OfferCountdown } from './offer-countdown'
import styles from './launch-offer.module.css'

type RecoveryPlan = { code: string; name: string; prices: LaunchOfferPrice[] }
export function LaunchOfferReminder({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()
  const detailId = useId()
  const [offer, setOffer] = useState<LaunchOffer | null>(null)
  const [plans, setPlans] = useState<RecoveryPlan[]>([])
  const [seconds, setSeconds] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const panel = /^\/painel(?:\/|$)/.test(pathname)
  const visiblePath = !pathname.endsWith('/novo') && !pathname.endsWith('/destaque')
  useEffect(() => {
    if (!enabled || !visiblePath) return
    let live = true
    async function refresh() {
      try {
        const result = await api<{ offer?: LaunchOffer | null }>('/v1/promotions/launch-offer')
        if (!live) return
        const current = result.status === 200 ? result.body.offer : null
        setOffer(current ?? null)
        setSeconds(current ? offerSecondsRemaining(current.expiresAt) : 0)
      } catch { if (live) setOffer(null) }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('promotion-purchase-completed', refresh)
    return () => { live = false; window.removeEventListener('focus', refresh); window.removeEventListener('promotion-purchase-completed', refresh) }
  }, [enabled, visiblePath, pathname])
  useEffect(() => {
    if (!offer) return
    const timer = window.setInterval(() => setSeconds(offerSecondsRemaining(offer.expiresAt)), 1000)
    return () => window.clearInterval(timer)
  }, [offer])
  useEffect(() => {
    if (!offer || !expanded || !enabled || !visiblePath) return
    let live = true
    setPlans([])
    void api<{ offers?: RecoveryPlan[]; launchOffer?: LaunchOffer | null }>(`/v1/promotions/offers?linkId=${encodeURIComponent(offer.linkId)}`).then(result => {
      if (!live) return
      const campaign = result.body.launchOffer
      if (result.status !== 200 || campaign?.id !== offer.id || offerSecondsRemaining(campaign.expiresAt) <= 0) { setPlans([]); setOffer(null); return }
      setPlans(result.body.offers ?? [])
    }).catch(() => { if (live) setPlans([]) })
    return () => { live = false }
  }, [offer, expanded, enabled, visiblePath])
  async function dismiss() {
    if (!offer || pending || panel) return
    setPending(true); setError('')
    try {
      const result = await api(`/v1/promotions/launch-offer/${offer.id}`, { method: 'DELETE' })
      if (result.status !== 200 && result.status !== 204) throw new Error()
      setOffer({ ...offer, dismissed: true })
    } catch { setError('Não foi possível ocultar. Tente novamente.') }
    finally { setPending(false) }
  }
  if (!enabled || !visiblePath || !offer || seconds <= 0 || (!panel && offer.dismissed)) return null
  const code = offer.productCode ?? 'SEARCH_NICHE'
  const duration = offer.durationDays ?? 7
  const plan = plans.find(row => row.code === code)
  const price = plan?.prices.find(row => row.durationDays === duration)
  const query = new URLSearchParams({ launch: '1', plan: code, duration: String(duration) })
  return <aside className={styles.recovery} aria-label="Oferta de destaque disponível">
    <div className={styles.recoveryInner}>
      <div className={styles.recoveryBar}>{expanded ? <div><p className={styles.deadline}>Oferta por tempo limitado</p><p className={styles.benefit}>{offer.discountPercent}% OFF no destaque</p></div> : <a className={styles.recoverySummary} href={`/painel/links/${encodeURIComponent(offer.linkId)}/destaque?${query}`} aria-label="Resgatar oferta"><p className={styles.deadline}>Oferta por tempo limitado</p><p className={styles.benefit}>{offer.discountPercent}% OFF no destaque</p><span className={styles.recoveryLink}>Resgatar oferta</span></a>}<OfferCountdown expiresAt={offer.expiresAt} compact /><button className={styles.expand} type="button" aria-label={`${expanded ? 'Recolher' : 'Expandir'} oferta de destaque`} aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpanded(value => !value)}><span aria-hidden="true">{expanded ? '−' : '+'}</span></button></div>
      {expanded ? <div className={styles.recoveryDetail} id={detailId}><div><p className={styles.quiet}>{offer.linkName}</p><p>{plan ? `${plan.name} · ${duration} dias` : 'Consulte os detalhes da oferta'}</p>{price ? <strong className={styles.recoveryPrice}>{formatCents(price.amountCents)}</strong> : null}</div><ButtonLink href={`/painel/links/${encodeURIComponent(offer.linkId)}/destaque?${query}`}>Resgatar oferta</ButtonLink>{panel ? <p className={styles.recoveryNote}>Sua oferta fica aqui até o prazo terminar.</p> : <Button className={styles.hide} type="button" variant="ghost" loading={pending} onClick={() => void dismiss()}>Ocultar aqui</Button>}{error ? <p role="status">{error}</p> : null}</div> : null}
    </div>
  </aside>
}
