'use client'

import styles from './stepper.module.css'

type StepperProps = { steps: readonly string[]; current: number; onBack?: (index: number) => void; disabled?: boolean; label?: string }

export function Stepper({ steps, current, onBack, disabled = false, label = 'Etapas do formulário' }: StepperProps) {
  return <nav aria-label={label}><ol className={styles.steps}>{steps.map((step, index) => <li key={step} aria-current={current === index ? 'step' : undefined} data-complete={index < current || undefined}>
    <button type="button" disabled={disabled || index >= current || !onBack} onClick={() => onBack?.(index)}><span className={styles.number} aria-hidden="true">{index + 1}</span><span>{step}</span><span className={styles.srOnly}>{index < current ? ', concluída' : index === current ? ', etapa atual' : ', próxima etapa'}</span></button>
  </li>)}</ol></nav>
}
