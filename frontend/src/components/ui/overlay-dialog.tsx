'use client'

import { useLayoutEffect, useId, useRef, type ReactNode } from 'react'
import styles from './overlay-dialog.module.css'

type OverlayDialogProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'modal' | 'sidebar'
  returnFocusTo?: HTMLElement | null
  closeDisabled?: boolean
  size?: 'default' | 'wide'
}

export function OverlayDialog({ open, title, onClose, children, variant = 'modal', returnFocusTo, closeDisabled = false, size = 'default' }: OverlayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
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
      if (event.key !== 'Tab' || event.defaultPrevented) return
      const dialog = event.currentTarget
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')).filter(element => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]'))
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus() }
    }}
    onCancel={event => { event.preventDefault(); if (!closeDisabled) onClose() }}
    onClick={event => { if (!closeDisabled && event.target === event.currentTarget) onClose() }}>
    <div className={styles.panel}>
      <header className={styles.header}>{variant === 'sidebar' ? <><img src="/logo.svg" width={140} height={26} alt="Tem Link Aqui" /><h2 id={titleId} className={styles.hiddenTitle}>{title}</h2></> : <h2 id={titleId}>{title}</h2>}<button type="button" aria-label={variant === 'sidebar' ? 'Fechar menu' : 'Fechar janela'} title="Fechar" disabled={closeDisabled} onClick={onClose}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button></header>
      <div className={styles.body}>{open ? children : null}</div>
    </div>
  </dialog>
}
