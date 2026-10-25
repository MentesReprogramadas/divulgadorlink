'use client'

import { cloneElement, isValidElement, useId, useState, type InputHTMLAttributes, type Ref, type ReactNode, type TextareaHTMLAttributes } from 'react'
export { Select } from './select'
import styles from './input.module.css'
import { LiquidLens } from './liquid-lens'
import { Checkbox } from './checkbox'

function controlClass(invalid: boolean | undefined, className: string | undefined): string {
  return ['field', invalid ? 'field-invalid' : '', className].filter(Boolean).join(' ')
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  icon,
  align = 'start',
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  icon?: ReactNode
  align?: 'start' | 'center'
  children: ReactNode
}) {
  const generatedId = useId()
  const [validation, setValidation] = useState('')
  const message = error || validation
  const control = isValidElement<{ id?: string; required?: boolean; invalid?: boolean; 'aria-describedby'?: string }>(children) ? children : null
  const id = htmlFor ?? control?.props.id ?? generatedId
  const descriptionId = message || hint ? `${id}-description` : undefined
  const describedBy = [control?.props['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field-block" onInvalidCapture={event => { if (isControl(event.target)) setValidation(validationMessage(event.target)) }} onBlurCapture={event => { if (isControl(event.target)) setValidation(validationMessage(event.target)) }} onChange={event => { if (validation && isControl(event.target)) setValidation(validationMessage(event.target)) }}>
      <div className={styles.labelRow} data-align={align}><label className="field-label" htmlFor={id}>{icon ? <span className={styles.labelIcon} aria-hidden="true">{icon}</span> : null}{label}</label>{control?.props.required ? <span className={styles.required} aria-hidden="true">*</span> : null}</div>
      {control ? cloneElement(control, { id, 'aria-describedby': describedBy, invalid: Boolean(message) || control.props.invalid }) : children}
      {message ? <span id={descriptionId} className="field-error" role="alert">{message}</span> : null}
      {hint && !message ? <span id={descriptionId} className="field-hint">{hint}</span> : null}
    </div>
  )
}

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
function isControl(target: EventTarget): target is FormControl { return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement }
function validationMessage(control: FormControl): string {
  const validity = control.validity
  if (control.disabled || validity.valid) return ''
  if (validity.valueMissing) return 'Preencha este campo.'
  if (validity.typeMismatch) return control instanceof HTMLInputElement && control.type === 'email' ? 'Digite um e-mail válido.' : 'Digite um endereço completo, começando com https://.'
  if (validity.tooShort && 'minLength' in control) return `Use pelo menos ${control.minLength} caracteres.`
  if (validity.tooLong && 'maxLength' in control) return `Use no máximo ${control.maxLength} caracteres.`
  if (validity.rangeUnderflow && 'min' in control) return `O valor mínimo é ${control.min}.`
  if (validity.rangeOverflow && 'max' in control) return `O valor máximo é ${control.max}.`
  if (validity.patternMismatch) return control.getAttribute('title') ?? 'Use o formato solicitado para este campo.'
  return validity.customError ? control.validationMessage : 'Confira o valor informado.'
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; ref?: Ref<HTMLInputElement> }) {
  if (props.type === 'checkbox') return <Checkbox aria-invalid={invalid || undefined} className={className} {...props} />
  if (props.type === 'radio') return <input aria-invalid={invalid || undefined} className={[styles.choice, className].filter(Boolean).join(' ')} {...props} />
  const input = <input className={controlClass(invalid, [styles.control, className].filter(Boolean).join(' '))} aria-invalid={invalid || undefined} {...props} />
  return ['checkbox','radio','hidden','color','range'].includes(props.type ?? 'text') || props.type === 'search' && props.role === 'combobox' ? input : <span className={styles.frame} data-control-frame><LiquidLens radius={12} />{input}</span>
}

export function TextArea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <span className={styles.frame} data-control-frame><LiquidLens radius={12} /><textarea className={controlClass(invalid, [styles.control, className].filter(Boolean).join(' '))} aria-invalid={invalid || undefined} {...props} /></span>
}
