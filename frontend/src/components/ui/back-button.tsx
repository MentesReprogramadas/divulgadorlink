'use client'

import { useRouter } from 'next/navigation'
import styles from './back-button.module.css'
import { LiquidLens } from './liquid-lens'

export function BackButton() {
  const router = useRouter()

  function goBack() {
    const referrer = document.referrer
    if (window.history.length > 1 && referrer && new URL(referrer).origin === window.location.origin) {
      router.back()
      return
    }
    router.push('/')
  }

  return (
    <button className={styles.button} type="button" onClick={goBack}>
      <LiquidLens radius={12} />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 5-7 7 7 7M5 12h14" />
      </svg>
      Voltar
    </button>
  )
}
