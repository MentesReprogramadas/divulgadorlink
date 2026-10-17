import type { CSSProperties, ReactNode } from 'react'
import styles from './skeleton.module.css'
import { Field, Input, TextArea } from '@/components/ui/input'

export function Skeleton({ width = '100%', height = '1em', round = false }: { width?: CSSProperties['width']; height?: CSSProperties['height']; round?: boolean }) {
  return <span aria-hidden="true" data-skeleton-block className={styles.block} style={{ width, height, borderRadius: round ? '50%' : undefined }} />
}

export function SkeletonRegion({ children, label = 'Carregando' }: { children: ReactNode; label?: string }) {
  return <div className={styles.region} role="status" aria-label={label} data-skeleton><span className={styles.srOnly}>{label}</span><div aria-hidden="true" inert>{children}</div></div>
}

export function SkeletonField({ multiline = false, hint = false, label, required = false, icon }: { multiline?: boolean; hint?: boolean | string; label?: string; required?: boolean; icon?: ReactNode }) {
  if (label) return <Field label={label} icon={icon} hint={typeof hint === 'string' ? hint : undefined}>{multiline ? <TextArea disabled required={required} rows={3} className={styles.control} /> : <Input disabled required={required} className={styles.control} />}</Field>
  return <div className="field-block" aria-hidden="true"><span className="field-label"><Skeleton width="42%" height={24} /></span>{multiline ? <TextArea disabled rows={3} className={styles.control} /> : <Input disabled className={styles.control} />}{hint ? <small className="field-hint"><Skeleton width="75%" height={21} /></small> : null}</div>
}

export function SkeletonButton() { return <span aria-hidden="true" className={`button ${styles.button}`}><Skeleton width={106} height={20} /></span> }
