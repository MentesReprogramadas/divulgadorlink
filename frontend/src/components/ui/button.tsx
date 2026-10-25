'use client'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from 'react'
import {useReadOnly} from './interaction-policy'
import styles from './button.module.css'
import { LiquidLens } from './liquid-lens'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const CLASS: Record<Variant, string> = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
  danger: 'button button-danger',
}

export function Button({
  variant = 'primary',
  className,
  loading = false,
  disabled,
  readOnlyAllowed=false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; ref?: Ref<HTMLButtonElement>;readOnlyAllowed?:boolean }) {
  const readOnly=useReadOnly()
  return (
    <button data-variant={variant} className={[CLASS[variant], styles.root, className].filter(Boolean).join(' ')} disabled={disabled || loading || readOnly&&!readOnlyAllowed} aria-busy={loading || undefined} {...props}>
      <LiquidLens radius={12} />
      {loading ? <span className={`button-spinner ${styles.spinner}`} aria-hidden="true" /> : null}
      <span className={styles.content} data-loading={loading || undefined}>{children}</span>
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a data-variant={variant} className={[CLASS[variant], styles.root, className].filter(Boolean).join(' ')} {...props}><LiquidLens radius={12} />{children}</a>
}
