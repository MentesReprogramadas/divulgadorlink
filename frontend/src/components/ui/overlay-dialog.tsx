'use client'

import { useLayoutEffect, useId, useRef, type ReactNode } from 'react'
import styles from './overlay-dialog.module.css'
import { LiquidLens } from './liquid-lens'

type OverlayDialogProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'modal' | 'sidebar'
  returnFocusTo?: HTMLElement | null
  closeDisabled?: boolean
  size?: 'default' | 'wide'
  closeLabel?: string
}

export function OverlayDialog({ open, title, onClose, children, variant = 'modal', returnFocusTo, closeDisabled = false, size = 'default',closeLabel='Fechar janela' }: OverlayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const wasOpen = useRef(false)
  const titleId = useId()
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!open) {
      // React can restore focus to the still-mounted close button after cleanup.
      if (wasOpen.current && returnFocusTo?.isConnected) returnFocusTo.focus()
      wasOpen.current = false
      return
    }
    if (!dialog) return
    wasOpen.current = true
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (returnFocusTo?.isConnected) returnFocusTo.focus()
    }
  }, [open, returnFocusTo])

  return <dialog ref={ref} className={styles.dialog} data-variant={variant} data-size={size} aria-labelledby={titleId} aria-hidden={!open || undefined}
    onKeyDown={event => {
      if ((event.target as HTMLElement).closest('dialog') !== event.currentTarget) return
      if (event.key !== 'Tab' || event.defaultPrevented) return
      const dialog = event.currentTarget
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]')).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.closest('dialog') === dialog && element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"], [inert]'))
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus() }
    }}
    onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); event.stopPropagation(); if (!closeDisabled) onClose() }}
    onClick={event => { if (!closeDisabled && event.target === event.currentTarget) onClose() }}>
    <div className={styles.panel}>
      <LiquidLens radius={20} />
      <header className={styles.header}>{variant === 'sidebar' ? <><LiquidLens radius={0} edge="none" /><img src="/brand/ondas-logo.svg" width={172} height={32} alt="Tem Link Aqui" /><h2 id={titleId} className={styles.hiddenTitle}>{title}</h2></> : <h2 id={titleId}>{title}</h2>}<button type="button" aria-label={variant === 'sidebar' ? 'Fechar menu' : closeLabel} title={closeLabel} disabled={closeDisabled} onClick={onClose}><LiquidLens radius={12} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button></header>
      <div className={styles.body}>{open ? children : null}</div>
    </div>
  </dialog>
}
