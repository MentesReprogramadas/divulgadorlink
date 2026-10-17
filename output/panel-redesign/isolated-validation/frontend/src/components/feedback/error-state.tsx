import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './feedback.module.css'

export function ErrorState({ onRetry, message = 'Não foi possível carregar.' }: { onRetry?: () => void; message?: string }) {
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      {onRetry ? <Button onClick={onRetry}><ActionIcon name="refresh" />Tentar de novo</Button> : null}
    </div>
  )
}
