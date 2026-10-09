'use client'

import { useEffect, useState } from 'react'

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

export function Consent({ pending }: { pending: boolean }) {
  const [choice, setChoice] = useState<Choice | undefined>(pending ? null : undefined)

  useEffect(() => {
    setChoice(readConsent())
  }, [])

  useEffect(() => {
    document.body.classList.toggle('has-consent', choice === null)
  }, [choice])

  useEffect(() => {
    if (choice !== 'marketing') return
    let cancelled = false
    void fetch('/anuncio/pixel')
      .then((response) => response.json())
      .then((body: { enabled?: boolean; pixelId?: string }) => {
        if (cancelled || !body.enabled || !body.pixelId) return
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://connect.facebook.net/en_US/fbevents.js'
        document.head.appendChild(script)
      })
    return () => {
      cancelled = true
    }
  }, [choice])

  if (choice !== null) return null

  return (
    <div className="consent-bar" role="region" aria-label="Cookies de medição">
      <p>Usamos um cookie para saber se o anúncio gerou uma publicação. A Meta só é medida se você aceitar.</p>
      <div className="consent-actions">
        <button type="button" className="button button-primary" onClick={() => { writeConsent('marketing'); setChoice('marketing') }}>Aceitar</button>
        <button type="button" className="button button-secondary" onClick={() => { writeConsent('denied'); setChoice('denied') }}>Agora não</button>
      </div>
    </div>
  )
}
