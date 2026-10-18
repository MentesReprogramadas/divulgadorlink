import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './feedback.module.css'

export function ErrorState({ onRetry, message = 'Não foi possível carregar.', variant = 'standard' }: { onRetry?: () => void; message?: string; variant?: 'standard' | 'compact' }) {
  return (
    <div className={variant === 'compact' ? `${styles.error} ${styles.compact}` : styles.error} role="alert">
      <p>{message}</p>
      {onRetry ? <Button onClick={onRetry}><ActionIcon name="refresh" />Tentar de novo</Button> : null}
    </div>
  )
}
