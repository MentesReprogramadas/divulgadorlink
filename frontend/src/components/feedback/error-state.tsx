import { Button } from '@/components/ui/button'

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert">
      <p>Não foi possível carregar.</p>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>Tentar de novo</Button> : null}
    </div>
  )
}
