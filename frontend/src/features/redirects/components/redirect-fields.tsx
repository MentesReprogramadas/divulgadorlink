import { Field, Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { RedirectFieldsValue } from '../redirect-contract'
import styles from './redirects.module.css'
export function RedirectFields({ value, onChange }: { value: RedirectFieldsValue; onChange: (value: RedirectFieldsValue) => void }) {
  return <>
    <Field label="Nome do link" hint="Ex.: Grupo de estudos. Este nome identifica o link, não a sua conta."><Input required maxLength={100} value={value.label} onChange={e => onChange({ ...value, label: e.target.value })} /></Field>
    <Field label="Link de destino" hint="Use a URL HTTPS atual do grupo ou da comunidade."><Input type="url" required maxLength={2048} value={value.destinationUrl} onChange={e => onChange({ ...value, destinationUrl: e.target.value })} /></Field>
    <label className={styles.checkbox}><Checkbox checked={value.requiresAge} onChange={e => onChange({ ...value, requiresAge: e.target.checked })} />Conteúdo para maiores de 18 anos</label>
  </>
}
