'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { trackMeta } from '@/domain/meta-pixel'
import { api } from '@/lib/api'

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

function countChoice(choice: Exclude<Choice, null>) {
  void api('/v1/analytics/consent', { method: 'POST', body: JSON.stringify({ choice }) }).catch(() => undefined)
}

async function syncTouch() {
  try {
    await fetch('/anuncio/toque', { method: 'POST' })
  } catch {
    return
  }
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

export const COOKIE_REVIEW = 'tla-cookie-review'

export function CookieSettings() {
  return (
    <p className="auth-switch">
      <button type="button" className="quiet-button" onClick={() => window.dispatchEvent(new Event(COOKIE_REVIEW))}>
        Gerenciar cookies
      </button>
    </p>
  )
}

export function Consent({ pending }: { pending: boolean }) {
  const [choice, setChoice] = useState<Choice | undefined>(pending ? null : undefined)
  const [reviewing, setReviewing] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  const open = choice === null || reviewing
  const pathname = usePathname()
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    trackMeta('PageView')
  }, [pathname])

  useEffect(() => {
    setChoice(readConsent())
  }, [])

  useEffect(() => {
    function review() { setReviewing(true) }
    window.addEventListener(COOKIE_REVIEW, review)
    return () => window.removeEventListener(COOKIE_REVIEW, review)
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || choice === undefined) return
    if (open) {
      if (!dialog.open) {
        try { dialog.showModal() } catch { dialog.open = true }
      }
    } else if (dialog.open) {
      dialog.close()
    }
    function refuse(event: Event) {
      event.preventDefault()
      if (choice !== null) {
        setReviewing(false)
        return
      }
      writeConsent('denied')
      setChoice('denied')
      countChoice('denied')
      void syncTouch()
    }
    dialog.addEventListener('cancel', refuse)
    return () => {
      dialog.removeEventListener('cancel', refuse)
    }
  }, [choice, open])

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

  function choose(value: Exclude<Choice, null>) {
    const changing = choice !== null && choice !== value
    if (choice !== value) countChoice(value)
    writeConsent(value)
    setChoice(value)
    setReviewing(false)
    void syncTouch().finally(() => {
      if (changing) location.reload()
    })
  }

  return (
    <>
      <dialog ref={ref} className="age-dialog" aria-labelledby="cookie-title">
        <h2 id="cookie-title">Este site usa cookies</h2>
        <p>Usamos cookies para o site funcionar e para lembrar suas preferências. Veja a <a href="/privacidade">Política de Privacidade</a>.</p>
        <div className="age-dialog-actions">
          <Button type="button" onClick={() => choose('marketing')}>Aceitar</Button>
          <Button type="button" variant="secondary" onClick={() => choose('denied')}>Recusar</Button>
        </div>
      </dialog>
    </>
  )
}
