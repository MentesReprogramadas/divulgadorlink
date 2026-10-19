import type { ProfileContent, ProfileRevisionDetail } from '../profile-contract'
import { profileComparison } from '../profile-comparison'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { ProfileDevicePreview } from './profile-device-preview'
import styles from './profile-history.module.css'
import {profileChannelComparison} from '@/features/profile-channels/channel-comparison'
import type {ChannelGroupSummary} from '@/features/profile-channels/channel-contract'
export function ProfileRevisionComparison({ revision, draft, draftChannelGroups, pending, error, confirm, onConfirm, onRestore, onClose }: { revision: ProfileRevisionDetail | null; draft: ProfileContent; draftChannelGroups?:ChannelGroupSummary[]; pending: boolean; error: string; confirm: boolean; onConfirm: () => void; onRestore: () => void; onClose: () => void }) {
  const rows = revision ? [...profileComparison(revision.content, draft),...profileChannelComparison(revision.channelGroups,draftChannelGroups)] : []
  const field = (row: ReturnType<typeof profileComparison>[number]) => <div key={row.label} className={styles.field} data-changed={row.changed || undefined}><dt>{row.label}{row.changed ? ' · Alterado' : ''}</dt><dd><div className={styles.value}><small>Versão {revision?.version}</small>{row.historical}</div><div className={styles.value}><small>Rascunho atual</small>{row.current}</div></dd></div>
  return <OverlayDialog open={Boolean(revision)} title={revision ? `Versão ${revision.version}` : 'Comparar versão'} size="wide" closeDisabled={pending} onClose={onClose}>{revision ? <div className={styles.comparison}>
    <p className={styles.policy}>Compare a versão antiga com seu rascunho atual antes de restaurar.</p>
    {!revision.photoAvailable ? <p className={styles.notice}>A foto antiga foi removida. A restauração será feita sem foto.</p> : null}
    <div className={styles.previews}>
      <section className={styles.preview} aria-label="Prévia da versão antiga"><h3>Versão {revision.version}</h3><p className={styles.policy}>Versão antiga</p><ProfileDevicePreview content={revision.content} photoAvailable={revision.photoAvailable} /></section>
      <section className={styles.preview} aria-label="Prévia do rascunho atual"><h3>Rascunho atual</h3><p className={styles.policy}>Alterações ainda em rascunho</p><ProfileDevicePreview content={draft} /></section>
    </div>
    {error ? <p role="alert">{error}</p> : null}
    {confirm ? <div className={styles.notice}><p>Substituir seu rascunho por esta versão? A página publicada continua como está.</p><div className={styles.actions}><Button loading={pending} onClick={onRestore}><ActionIcon name="restore" />Confirmar restauração</Button></div></div> : <div className={styles.actions}><Button onClick={onConfirm}><ActionIcon name="restore" />Restaurar no rascunho</Button></div>}
    <details><summary>Detalhes das alterações ({rows.filter(row => row.changed).length})</summary>{rows.some(row => row.changed) ? <dl className={styles.fields}>{rows.filter(row => row.changed).map(field)}</dl> : <p>Esta versão tem os mesmos dados do rascunho.</p>}
      {rows.some(row => !row.changed) ? <details><summary>Campos sem alteração ({rows.filter(row => !row.changed).length})</summary><dl className={styles.fields}>{rows.filter(row => !row.changed).map(field)}</dl></details> : null}
    </details>
  </div> : null}</OverlayDialog>
}
