'use client'

import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

function controlClass(invalid: boolean | undefined, className: string | undefined): string {
  return ['field', invalid ? 'field-invalid' : '', className].filter(Boolean).join(' ')
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  const generatedId = useId()
  const control = isValidElement<{ id?: string; invalid?: boolean; 'aria-describedby'?: string }>(children) ? children : null
  const id = htmlFor ?? control?.props.id ?? generatedId
  const descriptionId = error || hint ? `${id}-description` : undefined
  const describedBy = [control?.props['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field-block">
      <label className="field-label" htmlFor={id}>{label}</label>
      {control ? cloneElement(control, { id, 'aria-describedby': describedBy, invalid: Boolean(error) || control.props.invalid }) : children}
      {error ? <span id={descriptionId} className="field-error" role="alert">{error}</span> : null}
      {hint && !error ? <span id={descriptionId} className="field-hint">{hint}</span> : null}
    </div>
  )
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={controlClass(invalid, className)} aria-invalid={invalid || undefined} {...props} />
}

export function TextArea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={controlClass(invalid, className)} aria-invalid={invalid || undefined} {...props} />
}

export function Select({
  invalid,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select className={controlClass(invalid, className)} aria-invalid={invalid || undefined} {...props} />
}
