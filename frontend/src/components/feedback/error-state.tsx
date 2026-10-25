import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from './feedback.module.css'

export function ErrorState({ onRetry, message = 'Não foi possível carregar.', variant = 'standard',readOnlyAllowed=false,retryLabel='Tentar de novo' }: { onRetry?: () => void; message?: string; variant?: 'standard' | 'compact';readOnlyAllowed?:boolean;retryLabel?:string }) {
  return (
    <div className={variant === 'compact' ? `${styles.error} ${styles.compact}` : styles.error} role="alert">
      <LiquidLens radius={16} />
      <p>{message}</p>
      {onRetry ? <Button readOnlyAllowed={readOnlyAllowed} onClick={onRetry}><ActionIcon name="refresh" />{retryLabel}</Button> : null}
    </div>
  )
}
