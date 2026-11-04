'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { offerClock, offerSecondsRemaining } from '../launch-offer'
import styles from './offer-countdown.module.css'

function useOfferSeconds(expiresAt: string) {
  const [seconds, setSeconds] = useState(() => offerSecondsRemaining(expiresAt))
  useEffect(() => {
    const update = () => setSeconds(offerSecondsRemaining(expiresAt))
    update()
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [expiresAt])
  return seconds
}

function CountdownDigit({ value }: { value: string }) {
  const [previous, setPrevious] = useState(value)
  const [changed, setChanged] = useState(false)
  if (previous !== value) {
    setPrevious(value)
    setChanged(true)
  }
  return <span className={value === ':' ? styles.separator : styles.digit}><span key={value} className={changed ? styles.changedValue : styles.value}>{value}</span></span>
}

export function OfferCountdown({ expiresAt, compact = false }: { expiresAt: string; compact?: boolean }) {
  const seconds = useOfferSeconds(expiresAt)
  const clock = offerClock(seconds)
  return <time role="timer" className={`${styles.clock} ${compact ? styles.compact : ''}`} dateTime={expiresAt} aria-live="off" aria-label={`Oferta válida até ${new Date(expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}, horário de Brasília`}>
    <span aria-hidden="true">{clock.split('').map((digit, index) => <CountdownDigit key={index} value={digit} />)}</span>
  </time>
}

export function OfferDeadlineBanner({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const seconds = useOfferSeconds(expiresAt)
  const notified = useRef(false)
  const [bannerTarget, setBannerTarget] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => { setBannerTarget(document.getElementById('promotion-offer-banner')) }, [])
  useEffect(() => { notified.current = false }, [expiresAt])
  useEffect(() => {
    if (seconds > 0 || notified.current) return
    notified.current = true
    onExpire?.()
  }, [seconds, onExpire])
  const banner = <aside className={styles.banner} aria-label="Prazo da oferta de destaque">
    <div className={styles.inner}><p role="status">{seconds > 0 ? 'Oferta por tempo limitado' : 'Oferta encerrada'}</p><div className={styles.readout}><OfferCountdown expiresAt={expiresAt} /><span aria-hidden="true">HORAS · MIN · SEG</span></div></div>
  </aside>
  return bannerTarget ? createPortal(banner, bannerTarget) : banner
}
