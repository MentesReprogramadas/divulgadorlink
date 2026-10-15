import { Button } from '@/components/ui/button'
import styles from './feedback.module.css'

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <p>Não foi possível carregar.</p>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>Tentar de novo</Button> : null}
    </div>
  )
}
