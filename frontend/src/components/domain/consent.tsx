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
  document.cookie = `tla_consent=${value}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export function Consent() {
  const [choice, setChoice] = useState<Choice | undefined>(undefined)

  useEffect(() => {
    setChoice(readConsent())
  }, [])

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
    <div className="consent-bar" role="region" aria-label="Medição do anúncio">
      <p>Usamos a origem da visita para saber se o anúncio gerou uma publicação. A medida da Meta só liga se você aceitar.</p>
      <button type="button" onClick={() => { writeConsent('marketing'); setChoice('marketing') }}>Aceitar</button>
      <button type="button" onClick={() => { writeConsent('denied'); setChoice('denied') }}>Agora não</button>
    </div>
  )
}
