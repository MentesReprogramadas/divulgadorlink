'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import styles from './affiliate-entry.module.css'

export function AffiliateEntryForm({ slug }: { slug: string }) {
  const [phone, setPhone] = useState(''), [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setPending(true); setError('')
    try {
      const privacySignal = navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
      const marketingConsent = consent && !privacySignal
      const source = new URL(window.location.href)
      const fbclid = marketingConsent ? source.searchParams.get('fbclid') : null
      const result = await fetch('/api/affiliate-entry/' + encodeURIComponent(slug), { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', ...(privacySignal ? { DNT: '1' } : {}) }, body: JSON.stringify({ phone: marketingConsent ? phone : '', marketingConsent, sourceUrl: source.origin + source.pathname, ...(fbclid ? { fbclid } : {}) }) })
      const data = await result.json() as { joinUrl?: string }
      if (!result.ok || !data.joinUrl) throw new Error('Não foi possível continuar. Confira os dados e tente novamente.')
      const destination = new URL(data.joinUrl)
      if (destination.protocol !== 'https:' || destination.hostname !== 'temlinkaqui.com' || destination.port || destination.username || destination.password || destination.pathname !== '/ofertas/entrar/' + encodeURIComponent(slug) || destination.search || destination.hash) throw new Error('Convite inválido. Tente novamente.')
      window.location.assign(destination.href)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha de conexão. Tente novamente.'); lock.current = false; setPending(false) }
  }
  return <form className={styles.form} onSubmit={event => void submit(event)} aria-busy={pending}>
    <label htmlFor="affiliate-phone">Seu WhatsApp com DDD</label>
    <input id="affiliate-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="(11) 99999-9999" value={phone} onChange={event => setPhone(event.target.value.replace(/[^0-9+() .-]/g, ''))} aria-describedby="affiliate-phone-help" disabled={pending} />
    <p id="affiliate-phone-help">Opcional se você não autorizar a mensuração. O número ajuda a identificar seu ingresso no grupo.</p>
    <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={pending} /><span>Autorizo usar meu número e compartilhar meu cadastro e a confirmação de ingresso com a Meta para medir e otimizar anúncios.</span></label>
    <p>O aceite é opcional. Você pode participar sem autorizar. Sinais de privacidade do navegador serão respeitados. <a href="/privacidade">Política de privacidade</a>.</p>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <Button type="submit" loading={pending}>Continuar para o WhatsApp</Button>
  </form>
}
