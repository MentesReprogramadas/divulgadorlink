'use client'

import { useEffect, useRef } from 'react'
import styles from './form-steps.module.css'

export function FormSteps({ labels, current, onBack }: { labels: string[]; current: number; onBack?: (index: number) => void }) {
  const heading = useRef<HTMLParagraphElement>(null)
  const previous = useRef(current)
  useEffect(() => {
    if (previous.current !== current) heading.current?.focus()
    previous.current = current
  }, [current])
  return <div className={styles.steps}>
    <ol aria-label="Etapas do formulário">{labels.map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined}>
      <button type="button" aria-label={`${index + 1} ${label}`} disabled={!onBack || index >= current} onClick={() => onBack?.(index)}><span aria-hidden="true">{index + 1}</span>{' '}<span className={styles.stepLabel}>{label}</span></button>
    </li>)}</ol>
    <p ref={heading} tabIndex={-1} className={styles.current}>Etapa {current + 1} de {labels.length}: {labels[current]}</p>
  </div>
}
