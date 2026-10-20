import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './workspace-actions.module.css'

export function RefreshButton({ disabled, onClick, label = 'Atualizar dados' }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return <Button readOnlyAllowed type="button" variant="secondary" className={styles.refresh} aria-label={label} title={label} disabled={disabled} onClick={onClick}><ActionIcon name="refresh" /></Button>
}
export function BackToPanel() {
  return <a className={styles.back} href="/painel"><ActionIcon name="back" />Voltar ao painel</a>
}
