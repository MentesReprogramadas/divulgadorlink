'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Choice = 'marketing' | 'denied' | null

function readConsent(): Choice {
  const match = document.cookie.split('; ').find((row) => row.startsWith('tla_consent='))
  const value = match?.split('=')[1]
  if (value === 'marketing' || value === 'denied') return value
  return null
}

function writeConsent(value: Exclude<Choice, null>) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `tla_consent=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
}

type PixelQueue = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: PixelQueue
  loaded: boolean
  version: string
}

function installPixel(pixelId: string) {
  const host = window as Window & { fbq?: PixelQueue; _fbq?: PixelQueue }
  if (host.fbq) return
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as PixelQueue
  fbq.queue = []
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  host.fbq = fbq
  host._fbq = fbq
  fbq('init', pixelId)
  fbq('track', 'PageView')
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
}

export function Consent({ pending }: { pending: boolean }) {
  const [choice, setChoice] = useState<Choice | undefined>(pending ? null : undefined)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    setChoice(readConsent())
  }, [])

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog || choice !== null) return
    if (!dialog.open) dialog.showModal()
    function refuse(event: Event) {
      event.preventDefault()
      writeConsent('denied')
      setChoice('denied')
    }
    dialog.addEventListener('cancel', refuse)
    return () => {
      dialog.removeEventListener('cancel', refuse)
      if (dialog.open) dialog.close()
    }
  }, [choice])

  useEffect(() => {
    if (choice !== 'marketing') return
    let cancelled = false
    void fetch('/anuncio/pixel')
      .then((response) => response.json())
      .then((body: { enabled?: boolean; pixelId?: string }) => {
        if (cancelled || !body.enabled || !body.pixelId) return
        installPixel(body.pixelId)
      })
    return () => {
      cancelled = true
    }
  }, [choice])

  if (choice !== null) return null

  return (
    <dialog ref={ref} className="age-dialog" aria-labelledby="cookie-title">
      <h2 id="cookie-title">Este site usa cookies</h2>
      <p>Usamos cookies para o site funcionar e para lembrar suas preferências. Veja a <a href="/privacidade">Política de Privacidade</a>.</p>
      <div className="age-dialog-actions">
        <Button type="button" onClick={() => { writeConsent('marketing'); setChoice('marketing') }}>Aceitar</Button>
        <Button type="button" variant="secondary" onClick={() => { writeConsent('denied'); setChoice('denied') }}>Recusar</Button>
      </div>
    </dialog>
  )
}
